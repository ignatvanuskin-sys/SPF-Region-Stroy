/**
 * Единый поток заявки (master prompt §8.1) — сердце проекта.
 *
 * Порядок строго такой:
 *   1) идемпотентность по submission_id (защита от двойного клика);
 *   2) дедупликация: тот же телефон за 24 часа → не новый лид, а событие;
 *   3) запись в БД;
 *   4) и только потом уведомления (через outbox).
 *
 * Ни один сценарий не должен приводить к потере заявки: если уведомления
 * падают, лид уже в базе и виден в админке с красной пометкой.
 *
 * Функции не зависят от транспорта: их вызывают и HTTP-роут, и Telegram-бот,
 * и будущий WhatsApp-бот, и cron (§13).
 */

import type { Lead, LeadPriority, Measurement } from '@/lib/db/types';
import { getStore } from '@/lib/db';
import { detectDevice, detectSource } from '@/lib/domain/attribution';
import { enqueueLeadNotifications, enqueueStatusWebhook } from '@/lib/domain/notifications';
import {
  generateSlots,
  validateSlot,
  SLOT_ERROR_MESSAGES,
  type SlotValidationError,
} from '@/lib/domain/measurements';
import { assertTransition, type LeadStatus } from '@/lib/domain/statuses';
import { getSiteConfig } from '@/lib/domain/settings';
import { CONSENT_TEXT_VERSION, type LeadInput } from '@/lib/validation';
import { normalizeKzPhone } from '@/lib/phone';
import { cleanText } from '@/lib/utils';

/** Окно дедупликации по телефону. */
export const DUPLICATE_WINDOW_HOURS = 24;

export interface RequestContext {
  ip: string;
  userAgent: string | null;
  now?: Date;
}

export type DuplicateMode = 'merge' | 'create';

export interface CreateLeadOptions {
  /**
   * Что делать с повторным обращением за 24 часа:
   *  • `merge` (по умолчанию) — добавить событие к существующему лиду (§8.1);
   *  • `create` — создать новый лид. Нужно для замера и B2B, где повторное
   *    обращение по тому же телефону — это отдельная сущность (новая запись
   *    на замер), а не спам-дубль формы.
   */
  duplicateMode?: DuplicateMode;
}

export interface CreateLeadResult {
  lead: Lead;
  /** Создан новый лид. */
  created: boolean;
  /** Это повторное обращение, слитое в существующий лид. */
  duplicate: boolean;
  /** Повторная отправка той же формы — лид уже был, ничего не меняли. */
  idempotent: boolean;
  priority: LeadPriority;
}

function utmFromInput(input: LeadInput): Record<string, string> | null {
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) utm[key] = value.trim();
  }
  return Object.keys(utm).length ? utm : null;
}

/** B2B-заявки обрабатываются в приоритете (§6.4). */
function priorityFor(input: LeadInput): LeadPriority {
  return input.formType === 'b2b' ? 'high' : 'normal';
}

function commentFor(input: LeadInput): string | null {
  if (input.formType === 'b2b') {
    const parts = [
      input.comment,
      input.organization ? `Организация: ${input.organization}` : null,
      input.objectType ? `Объект: ${input.objectType}` : null,
      input.volume ? `Объём: ${input.volume}` : null,
      input.deadline ? `Сроки: ${input.deadline}` : null,
    ].filter(Boolean);
    return parts.length ? cleanText(parts.join(' · '), 2000) : null;
  }
  if (input.formType === 'measurement') {
    const address = [input.street, input.house, input.flat].filter(Boolean).join(', ');
    const parts = [input.comment, address ? `Адрес: ${address}` : null].filter(Boolean);
    return parts.length ? cleanText(parts.join(' · '), 1000) : null;
  }
  return input.comment ? cleanText(input.comment, 1000) : null;
}

function calcPayloadFor(input: LeadInput): Record<string, unknown> | null {
  return input.formType === 'calculator' ? (input.calc as Record<string, unknown>) : null;
}

/**
 * Тип конструкции лида. У калькулятора он лежит внутри `calc` — отдельного поля
 * в форме нет, чтобы не было двух источников правды. Без этого админка не смогла
 * бы фильтровать лиды по типу конструкции и считал бы статистику корректно.
 */
function productTypeFor(input: LeadInput): string | null {
  if (input.formType === 'calculator') return input.calc.productType;
  return ((input as Record<string, unknown>).productType as string) ?? null;
}

/**
 * Телефон в каноническом виде. Транспорт уже проверяет его через zod, но домен
 * не должен на это полагаться: если заявку создаёт другой канал (будущий
 * WhatsApp-бот, импорт), нормализация всё равно произойдёт и дедупликация
 * по телефону не сломается.
 */
function phoneFor(input: LeadInput): string {
  return normalizeKzPhone(input.phone) ?? input.phone;
}

/**
 * Создаёт лид по любой форме сайта.
 * Вызывающий код уже проверил данные через zod — здесь только бизнес-правила.
 */
export async function createLead(
  input: LeadInput,
  context: RequestContext,
  options: CreateLeadOptions = {},
): Promise<CreateLeadResult> {
  const store = getStore();
  const now = context.now ?? new Date();
  const nowIso = now.toISOString();
  const duplicateMode = options.duplicateMode ?? 'merge';

  // 1. Идемпотентность: та же отправка (двойной клик, обновление страницы).
  const existingBySubmission = await store.getLeadBySubmissionId(input.submissionId);
  if (existingBySubmission) {
    return {
      lead: existingBySubmission,
      created: false,
      duplicate: false,
      idempotent: true,
      priority: existingBySubmission.priority,
    };
  }

  // 2. Дедупликация по телефону.
  const phone = phoneFor(input);
  const duplicateSince = new Date(now.getTime() - DUPLICATE_WINDOW_HOURS * 3600_000).toISOString();
  const previous = await store.findRecentLeadByPhone(phone, duplicateSince);

  if (previous && duplicateMode === 'merge') {
    const event = await store.addLeadEvent({
      lead_id: previous.id,
      type: 'duplicate',
      actor_id: null,
      actor_label: null,
      payload: {
        formType: input.formType,
        productType: (input as Record<string, unknown>).productType ?? null,
        comment: commentFor(input) ?? null,
        source: detectSource({
          src: (input as Record<string, unknown>).src as string | undefined,
          utm: utmFromInput(input),
          referrer: (input as Record<string, unknown>).referrer as string | undefined,
        }),
        at: nowIso,
      },
      created_at: nowIso,
    });

    // Помечаем в Telegram, что клиент обратился повторно (§8.1, шаг 4).
    await store.enqueueNotification({
      channel: 'telegram',
      target: process.env.TELEGRAM_LEADS_CHAT_ID || process.env.TELEGRAM_OWNER_ID || '',
      payload: {
        kind: 'telegram',
        text: [
          `🔁 Повторное обращение по заявке #${previous.id}`,
          '',
          `👤 ${input.name}`,
          `📞 ${input.phone}`,
          `💬 ${commentFor(input) ?? 'без комментария'}`,
          `⏱ ${nowIso}`,
        ].join('\n'),
        keyboard: [[{ text: '✅ Взял в работу', callback_data: `take:${previous.id}` }]],
        meta: { leadId: previous.id },
      } as unknown as Record<string, unknown>,
      status: process.env.TELEGRAM_BOT_TOKEN ? 'pending' : 'failed',
      attempts: 0,
      next_attempt_at: nowIso,
      last_error: process.env.TELEGRAM_BOT_TOKEN ? null : 'TELEGRAM_BOT_TOKEN не настроен',
      created_at: nowIso,
      sent_at: null,
    });

    await store.updateLead(previous.id, { updated_at: nowIso });

    return {
      lead: { ...previous, updated_at: nowIso },
      created: false,
      duplicate: true,
      idempotent: false,
      priority: previous.priority,
    };
  }

  // 3. Запись в БД — до любых уведомлений.
  const priority = priorityFor(input);
  const lead = await store.createLead({
    submission_id: input.submissionId,
    segment: input.formType === 'b2b' ? 'b2b' : 'b2c',
    name: cleanText(input.name, 80),
    phone,
    phone_normalized: phone,
    email: (input as Record<string, unknown>).email
      ? cleanText((input as Record<string, unknown>).email, 160)
      : null,
    product_type: productTypeFor(input),
    calc_payload: calcPayloadFor(input),
    district: ((input as Record<string, unknown>).district as string) ?? null,
    comment: commentFor(input),
    status: 'new',
    assignee_id: null,
    priority,
    source: detectSource({
      src: (input as Record<string, unknown>).src as string | undefined,
      utm: utmFromInput(input),
      referrer: (input as Record<string, unknown>).referrer as string | undefined,
    }),
    utm: utmFromInput(input),
    referrer: ((input as Record<string, unknown>).referrer as string) || null,
    landing_path: ((input as Record<string, unknown>).landing_path as string) || null,
    request_path: ((input as Record<string, unknown>).request_path as string) || null,
    device: detectDevice(context.userAgent),
    locale: ((input as Record<string, unknown>).locale as string) || 'ru',
    consent_at: nowIso,
    consent_text_version: CONSENT_TEXT_VERSION,
    lost_reason: null,
    review_requested_at: null,
    created_at: nowIso,
    updated_at: nowIso,
    first_response_at: null,
  });

  await store.addLeadEvent({
    lead_id: lead.id,
    type: 'created',
    actor_id: null,
    actor_label: 'Сайт',
    payload: { formType: input.formType, source: lead.source, ip: maskIp(context.ip) },
    created_at: nowIso,
  });

  // 4. Уведомления — через outbox, чтобы сбой канала не терял заявку.
  await enqueueLeadNotifications(lead);

  return { lead, created: true, duplicate: false, idempotent: false, priority };
}

/** В логах и событиях IP храним усечённым — это уже персональные данные (§15). */
function maskIp(ip: string): string {
  if (!ip) return '';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::`;
  const parts = ip.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : '';
}

// ---------------------------------------------------------------------------
// Смена статуса, ответственный, удаление данных
// ---------------------------------------------------------------------------

export interface StatusChangeOptions {
  actorId?: number | null;
  actorLabel?: string;
  lostReason?: string | null;
  notify?: boolean;
}

export async function changeLeadStatus(
  leadId: number,
  nextStatus: LeadStatus,
  options: StatusChangeOptions = {},
): Promise<Lead> {
  const store = getStore();
  const lead = await store.getLead(leadId);
  if (!lead) throw new Error(`Лид #${leadId} не найден`);

  assertTransition(lead.status, nextStatus);

  const nowIso = new Date().toISOString();
  const patch: Partial<Lead> = { status: nextStatus };

  // Первый переход в «взял в работу» фиксирует время первой реакции — метрика §8.4.
  if (!lead.first_response_at && nextStatus === 'taken') {
    patch.first_response_at = nowIso;
  }
  if (nextStatus === 'lost') {
    if (!options.lostReason) throw new Error('Для отказа нужно указать причину');
    patch.lost_reason = options.lostReason;
  }

  const updated = await store.updateLead(leadId, patch);
  if (!updated) throw new Error(`Лид #${leadId} не найден`);

  await store.addLeadEvent({
    lead_id: leadId,
    type: nextStatus === 'taken' ? 'taken' : 'status_changed',
    actor_id: options.actorId ?? null,
    actor_label: options.actorLabel ?? 'Система',
    payload: { from: lead.status, to: nextStatus, lostReason: options.lostReason ?? null },
    created_at: nowIso,
  });

  if (options.notify !== false) {
    await enqueueStatusWebhook(updated, lead.status);
  }

  return updated;
}

export async function assignLead(
  leadId: number,
  assigneeId: number | null,
  actorLabel = 'Админка',
): Promise<Lead> {
  const store = getStore();
  const updated = await store.updateLead(leadId, { assignee_id: assigneeId });
  if (!updated) throw new Error(`Лид #${leadId} не найден`);
  await store.addLeadEvent({
    lead_id: leadId,
    type: 'assigned',
    actor_id: assigneeId,
    actor_label: actorLabel,
    payload: { assigneeId },
    created_at: new Date().toISOString(),
  });
  return updated;
}

export async function addLeadNote(leadId: number, text: string, actorLabel = 'Админка'): Promise<void> {
  const store = getStore();
  await store.addLeadEvent({
    lead_id: leadId,
    type: 'commented',
    actor_id: null,
    actor_label: actorLabel,
    payload: { text: cleanText(text, 1000) },
    created_at: new Date().toISOString(),
  });
}

/**
 * Удаление данных клиента по запросу (§11, §18.12). Удаляет лид, вложения и
 * связанные события — каскадом в БД и явно в файловом драйвере.
 */
export async function deleteLeadData(leadId: number): Promise<void> {
  const store = getStore();
  await store.deleteLeadFiles(leadId);
  await store.deleteLead(leadId);
}

// ---------------------------------------------------------------------------
// Запись на замер
// ---------------------------------------------------------------------------

export interface MeasurementRequestResult {
  lead: Lead;
  measurement: Measurement;
  duplicate: boolean;
  idempotent: boolean;
}

/**
 * Запрос на замер (§8.3). Создаёт лид и запись со статусом `pending`.
 * Слот проверяется повторно на сервере: вместимость, закрытые даты, горизонт.
 */
export async function requestMeasurement(
  input: Extract<LeadInput, { formType: 'measurement' }>,
  context: RequestContext,
): Promise<MeasurementRequestResult> {
  const store = getStore();
  const rules = await store.getMeasurementRules();
  const blackouts = await store.listBlackoutDates();
  const now = context.now ?? new Date();
  const busy = await store.listMeasurements({
    from: new Date(now.getTime() - 24 * 3600_000).toISOString(),
    to: new Date(now.getTime() + (rules.horizonDays + 2) * 24 * 3600_000).toISOString(),
  });

  const slotError: SlotValidationError | null = validateSlot(input.startsAt, {
    rules,
    blackoutDates: blackouts,
    busy,
    now,
  });
  if (slotError) {
    throw new Error(SLOT_ERROR_MESSAGES[slotError]);
  }

  const created = await createLead(input, context, { duplicateMode: 'create' });
  const lead = created.lead;

  const startsAt = new Date(input.startsAt);
  const measurement = await store.createMeasurement({
    lead_id: lead.id,
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + rules.slotMinutes * 60_000).toISOString(),
    district: input.district,
    street: input.street ?? null,
    house: input.house ?? null,
    flat: input.flat ?? null,
    status: 'pending',
    assignee_id: null,
    notes: input.comment ?? null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  await store.addLeadEvent({
    lead_id: lead.id,
    type: 'measure_requested',
    actor_id: null,
    actor_label: 'Сайт',
    payload: { startsAt: measurement.starts_at, district: measurement.district },
    created_at: now.toISOString(),
  });

  // Лид сразу отражает, что замер запрошен, но подтверждает его менеджер.
  await changeLeadStatus(lead.id, 'measure_booked', { actorLabel: 'Сайт', notify: false });

  return { lead, measurement, duplicate: created.duplicate, idempotent: created.idempotent };
}

/** Свободные слоты для интерфейса записи на замер. */
export async function availableSlots(fromIso?: string, toIso?: string) {
  const store = getStore();
  const rules = await store.getMeasurementRules();
  const blackouts = await store.listBlackoutDates();
  const now = new Date();
  const from = fromIso ? new Date(fromIso) : now;
  const to = toIso
    ? new Date(toIso)
    : new Date(now.getTime() + rules.horizonDays * 24 * 3600_000);

  const busy = await store.listMeasurements({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const slots = generateSlots({ now, rules, blackoutDates: blackouts, busy });
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return slots.filter((slot) => {
    const time = new Date(slot.startsAt).getTime();
    return time >= fromMs && time <= toMs;
  });
}
