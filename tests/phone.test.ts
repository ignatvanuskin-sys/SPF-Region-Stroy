import { describe, expect, it } from 'vitest';
import { formatPhone, isValidKzPhone, maskPhone, normalizeKzPhone, phoneToWaId } from '@/lib/phone';

/**
 * Нормализация телефона — самая частая точка отказа в потоке заявки: от неё
 * зависит дедупликация. Если «8 701…» и «+7 701…» дадут разные значения, один
 * клиент превратится в две заявки, а повторное обращение потеряется.
 */
describe('normalizeKzPhone', () => {
  it('приводит разные способы записи одного номера к одной форме', () => {
    const expected = '+77018936787';
    const variants = [
      '+7 701 893 67 87',
      '+77018936787',
      '8 701 893 67 87',
      '8(701)8936787',
      '87018936787',
      '701 893 67 87',
      '+7 (701) 893-67-87',
      '  +7-701-893-67-87  ',
      '0077018936787',
    ];
    for (const variant of variants) {
      expect(normalizeKzPhone(variant), `вариант: ${variant}`).toBe(expected);
    }
  });

  it('отклоняет номера, которые не могут быть казахстанскими', () => {
    const invalid = ['', '777', '12345', 'abc', '+1 202 555 0147', '123456789012345', '8 000 000 00 00'];
    for (const value of invalid) {
      expect(normalizeKzPhone(value), `значение: ${value}`).toBeNull();
    }
  });

  it('не принимает не-строки', () => {
    expect(normalizeKzPhone(null)).toBeNull();
    expect(normalizeKzPhone(undefined)).toBeNull();
    expect(normalizeKzPhone(77018936787)).toBeNull();
  });

  it('принимает городской номер Астаны (7172)', () => {
    expect(normalizeKzPhone('+7 7172 55 33 22')).toBe('+77172553322');
  });

  it('различает мобильные и городские номера', () => {
    expect(isValidKzPhone('+7 701 893 67 87')).toBe(true);
    // Городской номер корректен по форме, но это не мобильный
    expect(isValidKzPhone('+7 7172 55 33 22')).toBe(false);
  });
});

describe('formatPhone', () => {
  it('показывает номер в читаемом виде', () => {
    expect(formatPhone('+77018936787')).toBe('+7 701 893 67 87');
  });

  it('возвращает исходную строку, если формат нестандартный', () => {
    expect(formatPhone('+77172553322')).toBe('+7 717 255 33 22');
    expect(formatPhone('мусор')).toBe('мусор');
    expect(formatPhone(null)).toBe('');
  });
});

describe('phoneToWaId', () => {
  it('оставляет только цифры для ссылки wa.me', () => {
    expect(phoneToWaId('+7 701 893 67 87')).toBe('77018936787');
  });
});

describe('maskPhone', () => {
  it('маскирует середину номера — в логи он попадает обезличенным', () => {
    expect(maskPhone('+77018936787')).toBe('+7701***6787');
  });

  it('не пытается маскировать слишком короткое значение', () => {
    expect(maskPhone('123')).toBe('***');
    expect(maskPhone(null)).toBe('');
  });
});
