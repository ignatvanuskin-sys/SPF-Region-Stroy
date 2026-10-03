/**
 * lib/pipeline/types.ts — модель воронки и конфигурация автоматизации.
 *
 * Воронка соответствует реальному пути клиента из 2ГИС:
 *   new → confirmed → crm_synced → contacted → measurement_scheduled →
 *   measured → quote_sent → installed → review_requested
 *
 * Каждая автоматизация — это таймер, привязанный к этапу. Напоминания
 * разбирает планировщик: замер по слоту, отзыв по факту монтажа.
 */

export const STAGES = [
  'new',
  'confirmed',
  'crm_synced',
  'contacted',
  'measurement_scheduled',
  'measured',
  'quote_sent',
  'installed',
  'review_requested',
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  new: 'Заявка получена',
  confirmed: 'Заявка подтверждена клиенту',
  crm_synced: 'Передана в CRM',
  contacted: 'Менеджер связался',
  measurement_scheduled: 'Замер назначен',
  measured: 'Замер выполнен',
  quote_sent: 'Расчёт отправлен',
  installed: 'Монтаж выполнен',
  review_requested: 'Запрошен отзыв в 2ГИС',
};

/** Категории из пути клиента: «Окна», «Двери», «Фасадное остекление». */
export const LEAD_CATEGORIES = ['windows', 'doors', 'facade', 'repair', 'other'] as const;
export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<LeadCategory, string> = {
  windows: 'Окна',
  doors: 'Двери',
  facade: 'Фасадное остекление',
  repair: 'Ремонт окон',
  other: 'Другое',
};

export interface LeadPhoto {
  name: string;
  type: string;
  size: number;
}

export interface Lead {
  id: string;
  /** Секрет для страницы статуса: /zayavka/{id}?t={token} */
  token: string;
  stage: Stage;
  category: LeadCategory;
  createdAt: string;
  updatedAt: string;

  name?: string;
  phone: string;
  email?: string;
  contactWay?: 'whatsapp' | 'call';
  comment?: string;

  objectType?: string
  count?: string;
  sizes?: string;
  address?: string;
  photos: LeadPhoto[];

  /** Слот замера (ISO, Asia/Almaty), выбранный клиентом. */
  measurementSlot?: string;

  page?: string;
  utm?: string;

  /** Следующее запланированное действие и когда его выполнять. */
  nextAction?: ReminderKind;
  nextActionAt?: string;
  /** Уже отправленные напоминания — защита от дублей. */
  sentReminders: ReminderKind[];

  crm?: { provider: string; id?: string; ok: boolean; at: string; error?: string };
  /** Публичный идентификатор для сверки с менеджером. */
  reference: string;
}

export type ReminderKind =
  | 'sla_breach'
  | 'measurement_soon'
  | 'measurement_today'
  | 'quote_followup'
  | 'review_request';

export interface Reminder {
  kind: ReminderKind;
  leadId: string;
  dueAt: string;
  urgent: boolean;
  title: string;
  body: string;
}

/* ── Конфигурация процесса ───────────────────────────────────────
   Значения вынесены сюда, чтобы владелец мог менять их без правки кода.
   Сроки ответа и работы с отзывами на сайте показываются через маркеры
   достоверности, пока компания их не подтвердила.
   ──────────────────────────────────────────────────────────────── */

/**
 * ВАЖНО: здесь нет чтения process.env. Этот модуль попадает и в клиентский
 * бандл (генератор слотов замера работает в браузере), а process.env на
 * клиенте недоступен — чтение переменных дало бы разный результат на сервере
 * и в браузере. Значения меняются прямо здесь.
 */
export const PROCESS = {
  /** SLA менеджера: связаться с клиентом. */
  contactSlaMinutes: 10,
  /** За сколько часов до слота напомнить менеджеру и клиенту. */
  measurementReminderHours: [24, 2],
  /** Через сколько дней после замера напомнить про расчёт, если он не отправлен. */
  quoteFollowupDays: 2,
  /** Через сколько дней после монтажа запросить отзыв в 2ГИС. */
  reviewRequestDays: 3,
  /** Рабочее окно для записи на замер (часы по Asia/Almaty). */
  measurementHours: { from: 9, to: 18 },
  /** Дни недели для замера: 1 = понедельник … 7 = воскресенье. */
  measurementWeekdays: [1, 2, 3, 4, 5, 6] as number[],
  /** На сколько дней вперёд открыта запись. */
  bookingHorizonDays: 21,
  timezone: 'Asia/Almaty',
} as const;

/** Часовой пояс площадки: слоты считаются по локальному времени Астаны. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Локальное «сейчас» в Asia/Almaty в виде частей даты. */
export function almatyNow(base: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PROCESS.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(base);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

/** Смещение Asia/Almaty в минутах относительно UTC (UTC+5, без перехода на летнее время). */
export const ALMATY_OFFSET_MINUTES = 5 * 60;
