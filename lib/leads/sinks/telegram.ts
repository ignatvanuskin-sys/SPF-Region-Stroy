/**
 * lib/leads/sinks/telegram.ts — основной получатель заявок (раздел 11.4).
 * Токен только из переменных окружения, никогда в клиентском коде.
 * В логах — только requestId и статус.
 */

import { buildMessage, isHeic, type Lead, type Sink, type SinkResult } from '../types';

const API = 'https://api.telegram.org';

export function telegramConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const target = process.env.LEAD_TARGET === 'prod' ? 'prod' : 'test';
  const chatId =
    target === 'prod'
      ? (process.env.TELEGRAM_CHAT_ID_PROD ?? '')
      : (process.env.TELEGRAM_CHAT_ID_TEST ?? '');
  if (!token || !chatId) return null;
  return { token, chatId };
}

export const telegramSink: Sink = {
  name: 'telegram',
  isConfigured(): boolean {
    return telegramConfig() !== null;
  },
  async send(lead: Lead): Promise<SinkResult> {
    const config = telegramConfig();
    if (!config) return { sink: 'telegram', ok: false, error: 'not_configured' };

    try {
      const textRes = await fetch(`${API}/bot${config.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: buildMessage(lead),
          disable_web_page_preview: true,
        }),
      });

      if (!textRes.ok) {
        return { sink: 'telegram', ok: false, error: `sendMessage_${textRes.status}` };
      }

      if (lead.files.length > 0) {
        const photos = lead.files.filter((f) => !isHeic(f.type));
        const documents = lead.files.filter((f) => isHeic(f.type));

        if (photos.length > 0) {
          const form = new FormData();
          form.append('chat_id', config.chatId);
          const media = photos.map((file, i) => ({
            type: 'photo',
            media: `attach://file${i}`,
            caption: i === 0 ? 'Фото объекта' : undefined,
          }));
          form.append('media', JSON.stringify(media));
          photos.forEach((file, i) => {
            form.append(
              `file${i}`,
              new Blob([file.bytes], { type: file.type }),
              file.name,
            );
          });
          const photoRes = await fetch(`${API}/bot${config.token}/sendMediaGroup`, {
            method: 'POST',
            body: form,
          });
          if (!photoRes.ok) {
            return { sink: 'telegram', ok: false, error: `sendMediaGroup_${photoRes.status}` };
          }
        }

        // HEIC с iPhone Telegram не принимает как фото — отправляем документом.
        for (const file of documents) {
          const form = new FormData();
          form.append('chat_id', config.chatId);
          form.append('document', new Blob([file.bytes], { type: file.type }), file.name);
          const docRes = await fetch(`${API}/bot${config.token}/sendDocument`, {
            method: 'POST',
            body: form,
          });
          if (!docRes.ok) {
            return { sink: 'telegram', ok: false, error: `sendDocument_${docRes.status}` };
          }
        }
      }

      return { sink: 'telegram', ok: true };
    } catch (error) {
      return {
        sink: 'telegram',
        ok: false,
        error: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  },
};
