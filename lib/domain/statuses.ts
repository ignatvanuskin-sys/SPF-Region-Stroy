/**
 * Статусы лида (master prompt §11). Порядок воронки:
 * new → taken → contacted → measure_booked → measured → quote_sent → won → installed
 * Боковые ветки: lost (с обязательной причиной) и spam.
 */

export const LEAD_STATUSES = [
  'new',
  'taken',
  'contacted',
  'measure_booked',
  'measured',
  'quote_sent',
  'won',
  'installed',
  'lost',
  'spam',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Новая',
  taken: 'Взял в работу',
  contacted: 'Связались',
  measure_booked: 'Назначен замер',
  measured: 'Замер выполнен',
  quote_sent: 'Расчёт отправлен',
  won: 'Договор',
  installed: 'Монтаж выполнен',
  lost: 'Отказ',
  spam: 'Спам',
};

/** Цвет бейджа в админке. Значение — не единственный носитель смысла: рядом всегда текст. */
export const LEAD_STATUS_TONE: Record<LeadStatus, 'neutral' | 'info' | 'progress' | 'success' | 'danger'> = {
  new: 'danger',
  taken: 'info',
  contacted: 'info',
  measure_booked: 'progress',
  measured: 'progress',
  quote_sent: 'progress',
  won: 'success',
  installed: 'success',
  lost: 'neutral',
  spam: 'neutral',
};

/** Статусы, в которых заявка считается «в работе» (не закрыта). */
export const OPEN_STATUSES: LeadStatus[] = [
  'new',
  'taken',
  'contacted',
  'measure_booked',
  'measured',
  'quote_sent',
  'won',
];

export function isOpenStatus(status: LeadStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export const LOST_REASONS = [
  { value: 'expensive', label: 'Дорого' },
  { value: 'other_company', label: 'Выбрали другую компанию' },
  { value: 'no_answer', label: 'Не отвечает' },
  { value: 'changed_mind', label: 'Передумал' },
  { value: 'out_of_area', label: 'Вне зоны выезда' },
  { value: 'other', label: 'Другое' },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]['value'];

export const LOST_REASON_LABELS: Record<string, string> = Object.fromEntries(
  LOST_REASONS.map((reason) => [reason.value, reason.label]),
);

/**
 * Разрешённые переходы. Менеджер может двигать лид по воронке вперёд и назад
 * (клиент возвращается), но `spam` и `lost` — листья: из них только «вернуть в
 * работу» в `taken`. Это защищает метрики от случайных перескоков.
 */
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ['taken', 'contacted', 'measure_booked', 'quote_sent', 'won', 'installed', 'lost', 'spam'],
  taken: ['contacted', 'measure_booked', 'measured', 'quote_sent', 'won', 'installed', 'lost', 'spam'],
  contacted: ['measure_booked', 'measured', 'quote_sent', 'won', 'installed', 'lost', 'spam'],
  measure_booked: ['contacted', 'measured', 'quote_sent', 'won', 'installed', 'lost', 'spam'],
  measured: ['measure_booked', 'quote_sent', 'won', 'installed', 'lost', 'spam'],
  quote_sent: ['measured', 'won', 'installed', 'lost', 'spam'],
  won: ['installed', 'lost', 'spam'],
  installed: ['won'],
  lost: ['taken'],
  spam: ['taken'],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Недопустимый переход статуса: ${from} → ${to}`);
  }
}

/** События лида — пишутся в `lead_events` и видны в карточке как история. */
export const LEAD_EVENT_LABELS: Record<string, string> = {
  created: 'Заявка создана',
  notified: 'Уведомление отправлено',
  notify_failed: 'Уведомление не доставлено',
  taken: 'Взял в работу',
  status_changed: 'Смена статуса',
  commented: 'Комментарий',
  assigned: 'Назначен ответственный',
  measure_requested: 'Клиент запросил замер',
  measure_confirmed: 'Замер подтверждён',
  measure_rescheduled: 'Замер перенесён',
  measure_canceled: 'Замер отменён',
  measure_done: 'Замер выполнен',
  sla_breach: 'Нарушен SLA первого ответа',
  escalated: 'Эскалация владельцу',
  review_requested: 'Запрошен отзыв',
  duplicate: 'Повторное обращение',
  file_uploaded: 'Загружен файл',
  data_deleted: 'Данные клиента удалены',
};
