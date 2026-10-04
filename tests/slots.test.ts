import { describe, expect, it } from 'vitest';
import {
  generateSlots,
  localDateKey,
  tzOffsetMinutes,
  validateSlot,
  zonedParts,
  zonedTimeToUtc,
} from '@/lib/domain/measurements';
import type { MeasurementRules } from '@/lib/db/types';

/**
 * Слоты записи на замер (§8.3).
 *
 * Самое важное здесь — часовой пояс. Астана живёт в UTC+5 круглый год, но
 * полагаться на это «на глаз» нельзя: если конвертация ошибётся, клиент увидит
 * одно время, а мастер приедет в другое. Поэтому проверяем смещение явно.
 */

const RULES: MeasurementRules = {
  weekdays: [1, 2, 3, 4, 5], // Пн–Пт
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 12 * 60,
  slotMinutes: 60,
  capacityPerSlot: 2,
  minLeadHours: 12,
  horizonDays: 14,
  timezone: 'Asia/Almaty',
};

// Понедельник, 5 октября 2026, 06:00 UTC = 11:00 в Астане
const MONDAY_MORNING_UTC = new Date('2026-10-05T06:00:00.000Z');

describe('часовой пояс', () => {
  it('определяет смещение Астаны как UTC+5', () => {
    expect(tzOffsetMinutes(MONDAY_MORNING_UTC, 'Asia/Almaty')).toBe(300);
  });

  it('переводит локальное время в корректный UTC-момент', () => {
    // 09:00 в Астане = 04:00 UTC
    const utc = zonedTimeToUtc(2026, 10, 5, 9, 0, 'Asia/Almaty');
    expect(utc.toISOString()).toBe('2026-10-05T04:00:00.000Z');
  });

  it('разбирает локальные части даты', () => {
    const parts = zonedParts(MONDAY_MORNING_UTC, 'Asia/Almaty');
    expect(parts.hour).toBe(11);
    expect(parts.weekday).toBe(1); // понедельник
    expect(localDateKey(MONDAY_MORNING_UTC, 'Asia/Almaty')).toBe('2026-10-05');
  });
});

describe('generateSlots', () => {
  it('строит слоты только по рабочим дням внутри рабочих часов', () => {
    const slots = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });

    expect(slots.length).toBeGreaterThan(0);

    for (const slot of slots) {
      const parts = zonedParts(new Date(slot.startsAt), 'Asia/Almaty');
      expect(RULES.weekdays).toContain(parts.weekday);
      const minutes = parts.hour * 60 + parts.minute;
      expect(minutes).toBeGreaterThanOrEqual(RULES.dayStartMinutes);
      expect(minutes + RULES.slotMinutes).toBeLessThanOrEqual(RULES.dayEndMinutes);
    }
  });

  it('не предлагает слоты раньше минимального срока подготовки', () => {
    const slots = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });
    const earliest = MONDAY_MORNING_UTC.getTime() + RULES.minLeadHours * 3600_000;
    for (const slot of slots) {
      expect(new Date(slot.startsAt).getTime()).toBeGreaterThanOrEqual(earliest);
    }
  });

  it('пропускает выходные', () => {
    // Суббота, 10 октября 2026
    const saturday = new Date('2026-10-10T06:00:00.000Z');
    const slots = generateSlots({ now: saturday, rules: RULES });
    for (const slot of slots) {
      const weekday = zonedParts(new Date(slot.startsAt), 'Asia/Almaty').weekday;
      expect(RULES.weekdays).toContain(weekday);
      expect(weekday).not.toBe(6);
      expect(weekday).not.toBe(0);
    }
  });

  it('не выходит за горизонт записи', () => {
    const slots = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });
    const limit = MONDAY_MORNING_UTC.getTime() + (RULES.horizonDays + 1) * 24 * 3600_000;
    for (const slot of slots) {
      expect(new Date(slot.startsAt).getTime()).toBeLessThan(limit);
    }
  });

  it('помечает слот занятым, когда мест больше нет', () => {
    const base = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });
    const target = base[0];
    // Занимаем оба места в первом слоте
    const busy = [
      { starts_at: target.startsAt, ends_at: target.endsAt },
      { starts_at: target.startsAt, ends_at: target.endsAt },
    ];

    const withBusy = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES, busy });
    const updated = withBusy.find((slot) => slot.startsAt === target.startsAt);

    expect(updated?.available).toBe(false);
    expect(updated?.free).toBe(0);
    // Слот остаётся в списке, чтобы интерфейс мог показать «занято», а не пустоту
    expect(updated).toBeDefined();
  });

  it('считает частично занятый слот доступным', () => {
    const base = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });
    const target = base[0];
    const busy = [{ starts_at: target.startsAt, ends_at: target.endsAt }];

    const withBusy = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES, busy });
    const updated = withBusy.find((slot) => slot.startsAt === target.startsAt);
    expect(updated?.available).toBe(true);
    expect(updated?.free).toBe(1);
  });

  it('исключает закрытые даты', () => {
    const base = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES });
    const targetKey = localDateKey(new Date(base[0].startsAt), 'Asia/Almaty');

    const withBlackout = generateSlots({
      now: MONDAY_MORNING_UTC,
      rules: RULES,
      blackoutDates: [targetKey],
    });

    expect(
      withBlackout.some((slot) => localDateKey(new Date(slot.startsAt), 'Asia/Almaty') === targetKey),
    ).toBe(false);
  });
});

describe('validateSlot', () => {
  const validSlot = generateSlots({ now: MONDAY_MORNING_UTC, rules: RULES })[0];

  it('принимает корректный слот', () => {
    expect(validateSlot(validSlot.startsAt, { now: MONDAY_MORNING_UTC, rules: RULES })).toBeNull();
  });

  it('отклоняет слот, который уже прошёл', () => {
    expect(
      validateSlot('2020-01-01T04:00:00.000Z', { now: MONDAY_MORNING_UTC, rules: RULES }),
    ).toBe('too_soon');
  });

  it('отклоняет время вне рабочих часов', () => {
    // 03:00 в Астане — рабочий день, но до открытия
    const nightSlot = zonedTimeToUtc(2026, 10, 7, 3, 0, 'Asia/Almaty');
    expect(
      validateSlot(nightSlot.toISOString(), { now: MONDAY_MORNING_UTC, rules: RULES }),
    ).toBe('not_working_day');
  });

  it('отклоняет выходной', () => {
    // Воскресенье, 11 октября 2026, 10:00 по Астане
    const sundaySlot = zonedTimeToUtc(2026, 10, 11, 10, 0, 'Asia/Almaty');
    expect(
      validateSlot(sundaySlot.toISOString(), { now: MONDAY_MORNING_UTC, rules: RULES }),
    ).toBe('not_working_day');
  });

  it('отклоняет слот сверх вместимости', () => {
    const busy = [
      { starts_at: validSlot.startsAt, ends_at: validSlot.endsAt },
      { starts_at: validSlot.startsAt, ends_at: validSlot.endsAt },
    ];
    expect(
      validateSlot(validSlot.startsAt, { now: MONDAY_MORNING_UTC, rules: RULES, busy }),
    ).toBe('over_capacity');
  });

  it('отклоняет закрытую дату', () => {
    const dateKey = localDateKey(new Date(validSlot.startsAt), 'Asia/Almaty');
    expect(
      validateSlot(validSlot.startsAt, {
        now: MONDAY_MORNING_UTC,
        rules: RULES,
        blackoutDates: [dateKey],
      }),
    ).toBe('blackout');
  });

  it('отклоняет дату за пределами горизонта', () => {
    const farSlot = zonedTimeToUtc(2027, 6, 1, 10, 0, 'Asia/Almaty');
    expect(
      validateSlot(farSlot.toISOString(), { now: MONDAY_MORNING_UTC, rules: RULES }),
    ).toBe('outside_horizon');
  });

  it('возвращает понятную причину для мусорной даты', () => {
    expect(validateSlot('не дата', { now: MONDAY_MORNING_UTC, rules: RULES })).toBe('past');
  });
});
