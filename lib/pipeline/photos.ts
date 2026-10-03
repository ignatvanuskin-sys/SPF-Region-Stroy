/**
 * lib/pipeline/photos.ts — отправка фотографий объекта менеджеру в Telegram.
 *
 * Фото уходят отдельным сообщением после самой заявки: тяжёлый запрос
 * не должен задерживать главное. Заявка уже сохранена к этому моменту.
 * HEIC с iPhone Telegram не принимает как фото — отправляем документом.
 */

import { telegramConfig } from '@/lib/leads/sinks/telegram';
import { isHeic, type LeadFile } from '@/lib/leads/types';
import { CATEGORY_LABEL, type Lead } from './types';

export interface PhotoAttachment {
  name: string;
  type: string;
  size: number;
  bytes: ArrayBuffer;
}

export async function sendLeadPhotos(
  lead: Lead,
  attachments: PhotoAttachment[],
): Promise<{ ok: boolean; sent: number; error?: string }> {
  const config = telegramConfig();
  if (!config) return { ok: false, sent: 0, error: 'telegram_not_configured' };
  if (attachments.length === 0) return { ok: true, sent: 0 };

  const caption = `📷 ${CATEGORY_LABEL[lead.category]} · ${lead.reference}`;

  const photos = attachments.filter((f) => !isHeic(f.type));
  const documents = attachments.filter((f) => isHeic(f.type));
  let sent = 0;

  try {
    if (photos.length > 0) {
      const form = new FormData();
      form.append('chat_id', config.chatId);
      form.append(
        'media',
        JSON.stringify(
          photos.map((file, i) => ({
            type: 'photo',
            media: `attach://file${i}`,
            ...(i === 0 ? { caption } : {}),
          })),
        ),
      );
      photos.forEach((file, i) =>
        form.append(`file${i}`, new Blob([file.bytes], { type: file.type }), file.name),
      );

      const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMediaGroup`, {
        method: 'POST',
        body: form,
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, sent, error: `sendMediaGroup_${res.status}` };
      sent += photos.length;
    }

    for (const file of documents) {
      const form = new FormData();
      form.append('chat_id', config.chatId);
      form.append('document', new Blob([file.bytes], { type: file.type }), file.name);
      form.append('caption', `${caption} (${file.name})`);

      const res = await fetch(`https://api.telegram.org/bot${config.token}/sendDocument`, {
        method: 'POST',
        body: form,
        cache: 'no-store',
      });
      if (!res.ok) return { ok: false, sent, error: `sendDocument_${res.status}` };
      sent += 1;
    }

    return { ok: true, sent };
  } catch (error) {
    return { ok: false, sent, error: error instanceof Error ? error.message : 'unknown_error' };
  }
}

/** Приводит фото заявки к формату sink-слоя (используется в шаблонах сообщений). */
export function toSinkFiles(photos: Lead['photos']): LeadFile[] {
  return photos.map((p) => ({ ...p, bytes: new ArrayBuffer(0) }));
}
