import { describe, expect, it } from 'vitest';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  canTransition,
  isOpenStatus,
  LOST_REASONS,
  assertTransition,
} from '@/lib/domain/statuses';

/**
 * Статусы лида (§11).
 *
 * Смысл ограничений — защитить метрики: если из «Отказ» можно случайно перейти
 * в «Монтаж выполнен», воронка перестанет что-либо значить.
 */
describe('статусы лида', () => {
  it('у каждого статуса есть русская подпись для интерфейса', () => {
    for (const status of LEAD_STATUSES) {
      expect(LEAD_STATUS_LABELS[status], status).toBeTruthy();
      expect(LEAD_STATUS_LABELS[status]).not.toMatch(/[a-z_]{4,}/);
    }
  });

  it('причина отказа обязательна и перечислена по-русски', () => {
    expect(LOST_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(LOST_REASONS.map((reason) => reason.value)).toContain('expensive');
    for (const reason of LOST_REASONS) {
      expect(reason.label).not.toMatch(/[a-z_]{4,}/);
    }
  });

  it('разрешает движение по воронке вперёд', () => {
    expect(canTransition('new', 'taken')).toBe(true);
    expect(canTransition('taken', 'contacted')).toBe(true);
    expect(canTransition('contacted', 'measure_booked')).toBe(true);
    expect(canTransition('measured', 'quote_sent')).toBe(true);
    expect(canTransition('quote_sent', 'won')).toBe(true);
    expect(canTransition('won', 'installed')).toBe(true);
  });

  it('разрешает вернуть клиента назад — он может передумать и вернуться', () => {
    expect(canTransition('quote_sent', 'measured')).toBe(true);
    expect(canTransition('won', 'lost')).toBe(true);
  });

  it('не даёт перепрыгнуть из отказа в монтаж', () => {
    expect(canTransition('lost', 'installed')).toBe(false);
    expect(canTransition('lost', 'won')).toBe(false);
    expect(canTransition('spam', 'won')).toBe(false);
  });

  it('разрешает вернуть ошибочно помеченный спам в работу', () => {
    expect(canTransition('spam', 'taken')).toBe(true);
    expect(canTransition('lost', 'taken')).toBe(true);
  });

  it('считает повтор тем же статусом допустимым — это не ошибка', () => {
    for (const status of LEAD_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it('бросает понятную ошибку на недопустимом переходе', () => {
    expect(() => assertTransition('spam', 'installed')).toThrow(/Недопустимый переход/);
    expect(() => assertTransition('new', 'taken')).not.toThrow();
  });

  it('относит к «в работе» только незакрытые статусы', () => {
    expect(isOpenStatus('new')).toBe(true);
    expect(isOpenStatus('won')).toBe(true);
    expect(isOpenStatus('installed')).toBe(false);
    expect(isOpenStatus('lost')).toBe(false);
    expect(isOpenStatus('spam')).toBe(false);
  });
});
