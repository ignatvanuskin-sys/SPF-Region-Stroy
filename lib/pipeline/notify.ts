/**
 * lib/pipeline/notify.ts — уведомления менеджеру и подтверждение клиенту.
 *
 * Менеджер: Telegram (тот же бот, что и заявки) — доставка заявки и напоминаний.
 * Клиент:   автоматическое подтверждение на email, если он указан.
 *
 * Честное ограничение: автоматическое SMS/WhatsApp-подтверждение клиенту
 * требует провайдера (WhatsApp Business API или SMS-шлюз). Без него клиент
 * получает подтверждение на странице, а связь продолжается в WhatsApp
 * по готовой ссылке. Это отражено в README и в отчёте.
 */

import { buildMessage, type Lead as SinkLead } from '@/lib/leads/types';
import { telegramConfig } from '@/lib/leads/sinks/telegram';
import { formatSlot } from './schedule';
import { CATEGORY_LABEL, PROCESS, type Lead } from './types';

export interface NotifyResult {
  ok: boolean
  error?: string;
}

async function telegramSend(text: string, urgent = false): Promise<NotifyResult> {
  const config = telegramConfig();
  if (!config) return { ok: false, error: 'telegram_not_configured' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: urgent ? `🔴 ${text}` : text,
        disable_web_page_preview: true,
      }),
      cache: 'no-store',
    });
    return res.ok ? { ok: true } : { ok: false, error: `telegram_${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_error' };
  }
}

/** Сообщение менеджеру о новой заявке: карточка + готовый план действий. */
export function managerLeadText(lead: Lead): string {
  const header = [
    '🆕 Заявка с сайта',
    `Категория: ${CATEGORY_LABEL[lead.category]}`,
  ];

  const sinkLike = {
    ...lead,
    needs: CATEGORY_LABEL[lead.category],
    mode: 'quick',
    files: lead.photos.map((p) => ({ ...p, bytes: new ArrayBuffer(0) })),
    receivedAt: new Date(lead.createdAt),
    requestId: lead.reference,
  } as unknown as SinkLead;

  const body = buildMessage(sinkLike);

  const plan = [
    '',
    `⏱ Связаться с клиентом: в течение ${PROCESS.contactSlaMinutes} минут`,
    lead.measurementSlot
      ? `📅 Клиент выбрал замер: ${formatSlot(lead.measurementSlot)}`
      : '📅 Замер не выбран — предложите время',
    `🔗 Карточка заявки: /zayavka/${lead.id}`,
  ];

  return [...header, '', body, ...plan].join('\n');
}

export function notifyManagerAboutLead(lead: Lead): Promise<NotifyResult> {
  return telegramSend(managerLeadText(lead));
}

export function notifyManagerReminder(title: string, body: string, urgent: boolean): Promise<NotifyResult> {
  return telegramSend(`${title}\n\n${body}`, urgent);
}

/** Подтверждение клиенту на email. Возвращает ok=false, если email не указан. */
export async function confirmToClient(lead: Lead): Promise<NotifyResult> {
  if (!lead.email) return { ok: false, error: 'no_email' };

  const resendKey = process.env.RESEND_API_KEY ?? '';
  const from = process.env.SMTP_FROM || 'СПФ Регион Строй <onboarding@resend.dev>';
  if (!resendKey) return { ok: false, error: 'email_not_configured' };

  const lines = [
    lead.name ? `${lead.name}, здравствуйте!` : 'Здравствуйте!',
    '',
    'Заявка принята. Менеджер свяжется с вами в течение рабочего времени.',
    '',
    `Номер заявки: ${lead.reference}`,
    `Что нужно: ${CATEGORY_LABEL[lead.category]}`,
    lead.measurementSlot ? `Замер: ${formatSlot(lead.measurementSlot)}` : '',
    '',
    'Если удобнее в WhatsApp — просто ответьте на это письмо или напишите нам.',
    'СПФ Регион Строй, проспект Республики, 56/2а, Астана',
  ].filter(Boolean);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [lead.email],
        subject: `Заявка №${lead.reference} принята — СПФ Регион Строй`,
        text: lines.join('\n'),
      }),
      cache: 'no-store',
    });
    return res.ok ? { ok: true } : { ok: false, error: `resend_${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'unknown_error' };
  }
}
