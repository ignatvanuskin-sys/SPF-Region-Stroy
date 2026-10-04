/**
 * Слоты для записи на замер (master prompt §8.3).
 *
 * Правила (рабочие дни, часы, длительность слота, вместимость, минимальный
 * срок, горизонт, закрытые даты) хранятся в настройках и правятся в админке.
 * Все расчёты — в UTC, показ — в Asia/Almaty.
 *
 * Запись без SMS-подтверждения — это ЗАПРОС на замер (`pending`), а не
 * подтверждённая запись. Менеджер подтверждает её кнопкой в Telegram.
 */

import type { Measurement, MeasurementRules } from '@/lib/db/types';

export interface Slot {
  /** Начало слота, ISO в UTC. */
  startsAt: string;
  endsAt: string;
  /** Читаемое время в часовом поясе замеров, для интерфейса. */
  label: string;
  available: boolean;
  /** Сколько мест осталось в слоте. */
  free: number;
}

const MS_PER_MINUTE = 60_000;

/** Смещение часового пояса в минутах для конкретного момента. */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour') % 24,
    value('minute'),
    value('second'),
  );
  return (asUtc - date.getTime()) / MS_PER_MINUTE;
}

/** Локальное «стенное» время в конкретном поясе → корректный UTC-момент. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * MS_PER_MINUTE);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    weekday: weekdayMap[value('weekday')] ?? 1,
    hour: Number(value('hour')) % 24,
    minute: Number(value('minute')),
  };
}

/** YYYY-MM-DD в целевом поясе — ключ для «закрытых дат». */
export function localDateKey(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function formatSlotLabel(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  const datePart = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${datePart}, ${timePart}`;
}

export interface GenerateSlotsOptions {
  now?: Date;
  rules: MeasurementRules;
  blackoutDates?: string[];
  /** Уже занятые замеры — по ним считаем заполненность. */
  busy?: Pick<Measurement, 'starts_at' | 'ends_at'>[];
}

/**
 * Строит сетку слотов на горизонт вперёд. Недоступные слоты остаются в списке
 * с `available: false`, чтобы интерфейс мог показать «занято», а не пустоту.
 */
export function generateSlots({
  now = new Date(),
  rules,
  blackoutDates = [],
  busy = [],
}: GenerateSlotsOptions): Slot[] {
  const slots: Slot[] = [];
  const tz = rules.timezone;
  const blackout = new Set(blackoutDates);
  const earliest = now.getTime() + rules.minLeadHours * 60 * MS_PER_MINUTE;
  const start = zonedParts(now, tz);

  for (let dayOffset = 0; dayOffset <= rules.horizonDays; dayOffset++) {
    // Полдень выбранного дня — безопасная точка для расчёта даты/дня недели.
    const anchor = zonedTimeToUtc(start.year, start.month, start.day + dayOffset, 12, 0, tz);
    const parts = zonedParts(anchor, tz);
    if (!rules.weekdays.includes(parts.weekday)) continue;

    const dateKey = localDateKey(anchor, tz);
    if (blackout.has(dateKey)) continue;

    for (
      let minute = rules.dayStartMinutes;
      minute + rules.slotMinutes <= rules.dayEndMinutes;
      minute += rules.slotMinutes
    ) {
      const hour = Math.floor(minute / 60);
      const minutes = minute % 60;
      const startsAtDate = zonedTimeToUtc(parts.year, parts.month, parts.day, hour, minutes, tz);
      if (startsAtDate.getTime() < earliest) continue;

      const endsAtDate = new Date(startsAtDate.getTime() + rules.slotMinutes * MS_PER_MINUTE);
      const startsAt = startsAtDate.toISOString();
      const endsAt = endsAtDate.toISOString();

      const taken = busy.filter(
        (item) => item.starts_at < endsAt && item.ends_at > startsAt,
      ).length;
      const free = Math.max(0, rules.capacityPerSlot - taken);

      slots.push({
        startsAt,
        endsAt,
        label: formatSlotLabel(startsAt, tz),
        available: free > 0,
        free,
      });
    }
  }

  return slots;
}

export type SlotValidationError =
  | 'past'
  | 'outside_horizon'
  | 'not_working_day'
  | 'blackout'
  | 'over_capacity'
  | 'too_soon';

/**
 * Проверяет конкретный слот перед созданием записи. Возвращает `null`, если
 * всё в порядке, иначе — код причины, который клиент превращает в текст.
 */
export function validateSlot(
  startsAt: string,
  options: GenerateSlotsOptions & { rules: MeasurementRules },
): SlotValidationError | null {
  const { rules, blackoutDates = [], busy = [], now = new Date() } = options;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return 'past';
  if (start.getTime() < now.getTime() + rules.minLeadHours * 60 * MS_PER_MINUTE) return 'too_soon';

  const tz = rules.timezone;
  const parts = zonedParts(start, tz);
  const dateKey = localDateKey(start, tz);

  if ((blackoutDates ?? []).includes(dateKey)) return 'blackout';
  if (!rules.weekdays.includes(parts.weekday)) return 'not_working_day';

  const minutes = parts.hour * 60 + parts.minute;
  if (minutes < rules.dayStartMinutes || minutes + rules.slotMinutes > rules.dayEndMinutes) {
    return 'not_working_day';
  }

  const horizonLimit = new Date(now.getTime() + rules.horizonDays * 24 * 60 * MS_PER_MINUTE);
  if (start > horizonLimit) return 'outside_horizon';

  const endsAt = new Date(start.getTime() + rules.slotMinutes * MS_PER_MINUTE).toISOString();
  const iso = start.toISOString();
  const taken = busy.filter((item) => item.starts_at < endsAt && item.ends_at > iso).length;
  if (taken >= rules.capacityPerSlot) return 'over_capacity';

  return null;
}

export const SLOT_ERROR_MESSAGES: Record<SlotValidationError, string> = {
  past: 'Это время уже прошло. Выберите другой слот.',
  outside_horizon: 'Слишком далеко: выберите дату в пределах ближайших двух недель.',
  not_working_day: 'В это время замеры не проводим. Выберите другое время.',
  blackout: 'Этот день закрыт для записи. Выберите другой.',
  over_capacity: 'На это время все бригады заняты. Выберите другой слот.',
  too_soon: 'Нужно немного больше времени на подготовку. Выберите слот попозже.',
};
