/**
 * Каналы уведомлений за интерфейсом `Notifier` (§13).
 *
 * Ядро не знает, куда именно уходит заявка. Добавить новый канал (например,
 * WhatsApp Business API в фазе 2) — значит добавить файл и одну строку в
 * реестр ниже, без правки бизнес-логики.
 */

import type { NotificationChannel } from '@/lib/db/types';

export interface InlineButton {
  text: string;
  /** Либо ссылка, либо callback-данные — не оба сразу. */
  url?: string;
  callback_data?: string;
}

export interface TelegramPayload {
  kind: 'telegram';
  text: string;
  keyboard?: InlineButton[][];
  /** «Тихое» уведомление вне рабочих часов (§8.4). */
  disableNotification?: boolean;
  parseMode?: 'HTML' | 'MarkdownV2';
}

export interface EmailPayload {
  kind: 'email';
  subject: string;
  text: string;
}

export interface WebhookPayload {
  kind: 'webhook';
  event: string;
  data: Record<string, unknown>;
}

export type NotificationPayload = TelegramPayload | EmailPayload | WebhookPayload;

export interface Notifier {
  channel: NotificationChannel;
  /** Настроен ли канал. Ненастроенный канал просто пропускается, без ошибок. */
  isConfigured(): boolean;
  send(target: string, payload: NotificationPayload): Promise<void>;
}

export class NotifierError extends Error {}

/** Текст ошибки провайдера, обрезанный — чтобы не писать лишнее в лог. */
export function describeError(error: unknown): string {
  if (error instanceof NotifierError) return error.message;
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

// ------------------------------------------------------------------ Telegram

export class TelegramNotifier implements Notifier {
  readonly channel = 'telegram' as const;
  private token = process.env.TELEGRAM_BOT_TOKEN || '';

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  async send(target: string, payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) throw new NotifierError('TELEGRAM_BOT_TOKEN не задан');
    if (payload.kind !== 'telegram') throw new NotifierError('Неверный тип payload для Telegram');

    const body: Record<string, unknown> = {
      chat_id: target,
      text: payload.text.slice(0, 4000), // лимит Telegram — 4096 символов
      disable_notification: payload.disableNotification ?? false,
    };
    if (payload.parseMode) body.parse_mode = payload.parseMode;
    if (payload.keyboard?.length) {
      body.reply_markup = { inline_keyboard: payload.keyboard };
    }

    const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new NotifierError(`Telegram ${response.status}: ${detail.slice(0, 200)}`);
    }
  }

  /** Ответ на нажатие кнопки: убирает «часики» в клиенте Telegram. */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    if (!this.isConfigured()) return;
    await fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text?.slice(0, 200) }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
  }

  /** Правка существующей карточки — используется кнопкой «Взял в работу». */
  async editMessageReplyMarkup(
    chatId: string,
    messageId: number,
    keyboard: InlineButton[][],
  ): Promise<void> {
    if (!this.isConfigured()) return;
    await fetch(`https://api.telegram.org/bot${this.token}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: keyboard } }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
  }

  async setWebhook(url: string, secret: string): Promise<void> {
    if (!this.isConfigured()) throw new NotifierError('TELEGRAM_BOT_TOKEN не задан');
    const response = await fetch(`https://api.telegram.org/bot${this.token}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query'],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new NotifierError(`setWebhook ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}

// --------------------------------------------------------------------- Email

/**
 * Запасной канал (§8.1, шаг 6). Resend по HTTP — без SDK, чтобы не тянуть
 * зависимость ради одного запроса.
 */
export class EmailNotifier implements Notifier {
  readonly channel = 'email' as const;
  private apiKey = process.env.RESEND_API_KEY || '';
  private from = process.env.NOTIFY_EMAIL_FROM || 'СПФ Регион Строй <onboarding@resend.dev>';

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(target: string, payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) throw new NotifierError('RESEND_API_KEY не задан');
    if (payload.kind !== 'email') throw new NotifierError('Неверный тип payload для e-mail');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [target],
        subject: payload.subject,
        text: payload.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new NotifierError(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
  }
}

// ------------------------------------------------------------------- Webhook

/** Универсальный адаптер для будущих CRM: Bitrix24, amoCRM, Google Sheets (§8.8). */
export class WebhookNotifier implements Notifier {
  readonly channel = 'webhook' as const;
  private url = process.env.LEAD_WEBHOOK_URL || '';

  isConfigured(): boolean {
    return Boolean(this.url);
  }

  async send(target: string, payload: NotificationPayload): Promise<void> {
    const endpoint = target || this.url;
    if (!endpoint) throw new NotifierError('LEAD_WEBHOOK_URL не задан');
    if (payload.kind !== 'webhook') throw new NotifierError('Неверный тип payload для webhook');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: payload.event, data: payload.data, sent_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new NotifierError(`Webhook ${response.status}`);
    }
  }
}

export const NOTIFIERS: Notifier[] = [
  new TelegramNotifier(),
  new EmailNotifier(),
  new WebhookNotifier(),
];

export function notifierFor(channel: NotificationChannel): Notifier | undefined {
  return NOTIFIERS.find((notifier) => notifier.channel === channel);
}

/** Один экземпляр Telegram-клиента переиспользуем и вне outbox. */
export const telegramNotifier = NOTIFIERS[0] as TelegramNotifier;
