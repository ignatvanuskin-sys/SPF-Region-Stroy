/**
 * Outbox уведомлений (master prompt §8.1, шаг 6 и §10 «Надёжность»).
 *
 * Принцип: сначала запись в БД, потом уведомление. Заявка уже сохранена, и
 * даже если Telegram недоступен, ничего не теряется: запись в `notifications`
 * со статусом `pending` дожидается следующего прогона cron.
 *
 * Повторы — с нарастающей паузой; после 6 попыток статус `failed`, и лид
 * подсвечивается в админке красным «не доставлено менеджеру».
 */

import type { Lead, NotificationChannel } from '@/lib/db/types';
import { getStore } from '@/lib/db';
import { notifierFor } from '@/lib/notify/channels';
import { describeError } from '@/lib/notify/channels';
import { leadCardText, leadSummaryForEmail, summarizeCalc } from '@/lib/notify/templates';
import { getSiteConfig } from '@/lib/domain/settings';
import { formatPhone } from '@/lib/phone';

/** Данные, которые нужны, чтобы собрать уведомление о лиде. */
interface TelegramLeadPayload {
  kind: 'telegram';
  text: string;
  keyboard?: { text: string; url?: string; callback_data?: string }[][];
  disableNotification?: boolean;
  /** Метаданные для админки и для запасного канала. */
  meta: {
    leadId: number;
    /** Заполняется, когда запасное письмо уже отправлено — чтобы не дублировать. */
    fallbackEnqueued?: boolean;
    emailFallback?: { subject: string; text: string };
  };
}

/** Полезная нагрузка любого канала в outbox. */
export type OutboxPayload = TelegramLeadPayload | { kind: 'email'; subject: string; text: string; meta?: { leadId?: number } } | {
  kind: 'webhook';
  event: string;
  data: Record<string, unknown>;
  meta?: { leadId?: number };
};

/** Кнопки под карточкой заявки (Приложение C). */
export function leadKeyboard(lead: Lead) {
  const companyPhone = process.env.PHONE_PRIMARY || '+77018936787';
  const waPhone = process.env.WHATSAPP_PRIMARY || companyPhone.replace('+', '');
  const callHref = `tel:${companyPhone}`;
  const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    `Здравствуйте! Пишу по заявке №${lead.id} с сайта.`,
  )}`;

  return [
    [
      { text: '✅ Взял в работу', callback_data: `take:${lead.id}` },
      { text: '🔄 Статус', callback_data: `status_menu:${lead.id}` },
    ],
    [
      { text: '📞 Позвонить', url: callHref },
      { text: '💬 WhatsApp', url: waHref },
    ],
    [
      { text: '📅 Назначить замер', callback_data: `measure_menu:${lead.id}` },
      { text: '🗑 Спам', callback_data: `spam:${lead.id}` },
    ],
  ];
}

async function resolveTargets(): Promise<{ telegram: string | null; email: string | null; webhook: string | null }> {
  const config = await getSiteConfig();
  return {
    telegram: process.env.TELEGRAM_LEADS_CHAT_ID || process.env.TELEGRAM_OWNER_ID || null,
    email: config.notify.emailTo,
    webhook: config.notify.webhookUrl,
  };
}

/**
 * Ставит в очередь все уведомления о новой заявке. Ничего не отправляет сразу:
 * отправку делает `processOutbox`, чтобы неудачная попытка не задерживала
 * ответ клиенту и могла быть повторена.
 */
export async function enqueueLeadNotifications(lead: Lead): Promise<void> {
  const store = getStore();
  const config = await getSiteConfig();
  const targets = await resolveTargets();
  const context = {
    timeZone: config.workingHours ? 'Asia/Almaty' : 'Asia/Almaty',
    whatsappPhone: config.whatsappPrimary,
    calcSummary: summarizeCalc(lead.calc_payload),
  };

  const card = leadCardText(lead, context);
  const email = leadSummaryForEmail(lead, context);

  if (targets.telegram) {
    const payload: TelegramLeadPayload = {
      kind: 'telegram',
      text: card,
      keyboard: leadKeyboard(lead),
      meta: { leadId: lead.id, emailFallback: email },
    };
    await store.enqueueNotification({
      channel: 'telegram',
      target: targets.telegram,
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    });
  } else {
    // Telegram не настроен — фиксируем это, чтобы владелец увидел в админке,
    // что заявка не ушла менеджеру, а не надеялся на «должно работать».
    await store.enqueueNotification({
      channel: 'telegram',
      target: '',
      payload: { kind: 'telegram', text: card, meta: { leadId: lead.id } } as unknown as Record<string, unknown>,
      status: 'failed',
      attempts: 1,
      next_attempt_at: new Date().toISOString(),
      last_error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_LEADS_CHAT_ID не настроены',
      created_at: new Date().toISOString(),
      sent_at: null,
    });
  }

  if (targets.webhook) {
    await store.enqueueNotification({
      channel: 'webhook',
      target: targets.webhook,
      payload: {
        kind: 'webhook',
        event: 'lead.created',
        data: publicLeadPayload(lead),
        meta: { leadId: lead.id },
      } as unknown as Record<string, unknown>,
      status: 'pending',
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    });
  }
}

/** Данные лида для внешних систем — без лишних персональных полей. */
export function publicLeadPayload(lead: Lead): Record<string, unknown> {
  return {
    id: lead.id,
    segment: lead.segment,
    name: lead.name,
    phone: formatPhone(lead.phone),
    email: lead.email,
    product_type: lead.product_type,
    district: lead.district,
    comment: lead.comment,
    status: lead.status,
    priority: lead.priority,
    source: lead.source,
    utm: lead.utm,
    created_at: lead.created_at,
    calc_payload: lead.calc_payload,
  };
}

/** Уведомление о смене статуса — уходит во внешние системы (§8.8). */
export async function enqueueStatusWebhook(lead: Lead, previousStatus: string): Promise<void> {
  const targets = await resolveTargets();
  if (!targets.webhook) return;
  const store = getStore();
  await store.enqueueNotification({
    channel: 'webhook',
    target: targets.webhook,
    payload: {
      kind: 'webhook',
      event: 'lead.status_changed',
      data: { ...publicLeadPayload(lead), previous_status: previousStatus },
      meta: { leadId: lead.id },
    } as unknown as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    next_attempt_at: new Date().toISOString(),
    last_error: null,
    created_at: new Date().toISOString(),
    sent_at: null,
  });
}

/** Нарастающая пауза между попытками: 30 с, 1 мин, 2 мин … до 30 мин. */
export function backoffMs(attempts: number): number {
  const base = 30_000;
  return Math.min(base * 2 ** Math.max(0, attempts - 1), 30 * 60_000);
}

export interface ProcessOutboxResult {
  processed: number;
  sent: number;
  failed: number;
}

/**
 * Прогон очереди. Вызывается cron-эндпоинтом каждые 1–5 минут (§12).
 * Идемпотентен: успешная отправка помечается `sent`, повторно не уйдёт.
 */
export async function processOutbox(limit = 25): Promise<ProcessOutboxResult> {
  const store = getStore();
  const pending = await store.listPendingNotifications(new Date().toISOString(), limit);
  const result: ProcessOutboxResult = { processed: 0, sent: 0, failed: 0 };

  for (const item of pending) {
    result.processed += 1;
    const notifier = notifierFor(item.channel as NotificationChannel);
    const payload = item.payload as unknown as OutboxPayload;

    if (!notifier || !notifier.isConfigured()) {
      await store.markNotificationFailed(
        item.id,
        `Канал «${item.channel}» не настроен или не поддерживается`,
        new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      );
      result.failed += 1;
      await enqueueEmailFallback(payload, item.attempts);
      continue;
    }

    try {
      await notifier.send(item.target, payload as any);
      await store.markNotificationSent(item.id);
      result.sent += 1;
    } catch (error) {
      const message = describeError(error);
      const attempts = item.attempts + 1;
      await store.markNotificationFailed(item.id, message, new Date(Date.now() + backoffMs(attempts)).toISOString());
      result.failed += 1;
      // Запасной канал: письмо на NOTIFY_EMAIL_TO, чтобы заявка не потерялась.
      if (attempts >= 2) await enqueueEmailFallback(payload, attempts);
    }
  }

  return result;
}

/**
 * Запасной канал e-mail (§8.1). Ставится один раз на уведомление — повторные
 * прогоны cron не должны превращаться в спам менеджеру.
 */
async function enqueueEmailFallback(payload: OutboxPayload, attempts: number): Promise<void> {
  if (payload.kind !== 'telegram') return;
  if (payload.meta?.fallbackEnqueued) return;
  const emailFallback = payload.meta?.emailFallback;
  if (!emailFallback) return;

  const targets = await resolveTargets();
  if (!targets.email) return;

  const store = getStore();
  await store.enqueueNotification({
    channel: 'email',
    target: targets.email,
    payload: {
      kind: 'email',
      subject: `[дубль по Telegram] ${emailFallback.subject}`,
      text: [
        'Заявка не доставлена в Telegram — отправляем письмом.',
        `Попыток: ${attempts}.`,
        '',
        emailFallback.text,
      ].join('\n'),
      meta: { leadId: payload.meta.leadId },
    } as unknown as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    next_attempt_at: new Date().toISOString(),
    last_error: null,
    created_at: new Date().toISOString(),
    sent_at: null,
  });

  // Помечаем, что запасной канал уже задействован.
  payload.meta.fallbackEnqueued = true;
}

export interface LeadDeliveryState {
  delivered: boolean;
  pending: boolean;
  failed: boolean;
  lastError: string | null;
}

/**
 * Состояние доставки заявки менеджеру — для красной пометки в админке.
 * Смотрим последние уведомления по этому лиду.
 */
export async function leadDeliveryState(leadId: number): Promise<LeadDeliveryState> {
  const store = getStore();
  const items = await store.listNotifications(300);
  const related = items.filter((item) => {
    const meta = (item.payload as any)?.meta;
    return Number(meta?.leadId) === leadId;
  });

  if (related.length === 0) {
    return { delivered: false, pending: false, failed: true, lastError: 'Уведомления не создавались' };
  }

  const sent = related.some((item) => item.status === 'sent');
  const pending = related.some((item) => item.status === 'pending');
  const failed = related.some((item) => item.status === 'failed');
  const lastError = related.find((item) => item.last_error)?.last_error ?? null;

  return { delivered: sent, pending, failed, lastError };
}
