/**
 * lib/pipeline/schedule.ts — запись на замер.
 *
 * Слоты строятся по локальному времени Астаны (UTC+5, без перехода на летнее
 * время) в пределах рабочего окна. Сетка — двухчасовые интервалы, чтобы
 * менеджер успевал доехать; это рабочее допущение автоматизации, а не факт
 * о компании, и оно настраивается в PROCESS.
 */

import { ALMATY_OFFSET_MINUTES, PROCESS, almatyNow } from './types';

export interface Slot {
  /** ISO-строка UTC — то, что хранится в заявке. */
  iso: string;
  /** Подпись для интерфейса по-русски. */
  label: string;
  /** Короткая подпись: «пн, 6 окт». */
  dayLabel: string;
  timeLabel: string;
  value: number;
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTHS_GENITIVE = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

/** UTC-время для локального часа Астаны в указанную дату. */
function almatyToUtc(year: number, month: number, day: number, hour: number): number {
  return Date.UTC(year, month - 1, day, hour, 0, 0) - ALMATY_OFFSET_MINUTES * 60 * 1000;
}

/** День недели и дата по календарю Астаны. */
function almatyWeekday(year: number, month: number, day: number): number {
  // Полдень UTC сдвигаем на смещение и читаем день недели в UTC.
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/**
 * Ближайшие доступные слоты для записи на замер.
 * Слоты, которые наступают раньше чем через 3 часа, не предлагаются:
 * менеджер должен успеть подтвердить выезд.
 */
export function availableSlots(base: Date = new Date(), limit = 40): Slot[] {
  const now = base.getTime();
  const minNotice = 3 * 60 * 60 * 1000;
  const start = almatyNow(base);
  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset <= PROCESS.bookingHorizonDays; dayOffset += 1) {
    const cursor = new Date(Date.UTC(start.year, start.month - 1, start.day + dayOffset, 12));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();

    const weekday = almatyWeekday(year, month, day);
    const isoWeekday = weekday === 0 ? 7 : weekday;
    if (!PROCESS.measurementWeekdays.includes(isoWeekday)) continue;

    for (let hour = PROCESS.measurementHours.from; hour <= PROCESS.measurementHours.to; hour += 2) {
      const utcMs = almatyToUtc(year, month, day, hour);
      if (utcMs < now + minNotice) continue;

      const d = new Date(utcMs);
      const dayLabel = `${WEEKDAYS_SHORT[weekday]}, ${day} ${MONTHS_GENITIVE[month - 1]}`;
      const timeLabel = `${String(hour).padStart(2, '0')}:00`;

      slots.push({
        iso: d.toISOString(),
        value: utcMs,
        dayLabel,
        timeLabel,
        label: `${dayLabel}, ${timeLabel}—${String(hour + 2).padStart(2, '0')}:00`,
      });

      if (slots.length >= limit) return slots;
    }
  }

  return slots;
}

/** Проверка, что присланный клиентом слот действительно существует в сетке. */
export function isValidSlot(iso: string, base: Date = new Date()): boolean {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return false;
  return availableSlots(base, 200).some((slot) => slot.value === target);
}

/** Группировка слотов по дням — для интерфейса выбора. */
export function groupSlotsByDay(slots: Slot[]): { dayLabel: string; slots: Slot[] }[] {
  const groups: { dayLabel: string; slots: Slot[] }[] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last && last.dayLabel === slot.dayLabel) last.slots.push(slot);
    else groups.push({ dayLabel: slot.dayLabel, slots: [slot] });
  }
  return groups;
}

/** Человекочитаемая дата-время слота по Астане. */
export function formatSlot(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: PROCESS.timezone,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

export function addHours(iso: string, hours: number): string {
  return addMinutes(iso, hours * 60);
}
