import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRICE_CONFIG,
  areaOf,
  calculatePrice,
  priceResponse,
  type PriceConfig,
} from '@/lib/domain/pricing';
import { calcPayloadSchema, type CalcPayload } from '@/lib/validation';

const BASE_CALC: CalcPayload = {
  productType: 'okno-pvh',
  widthMm: 1400,
  heightMm: 1500,
  sections: 2,
  opening: 'tilt-turn',
  quantity: 1,
  color: 'Белый',
  glazing: 'Двухкамерный',
  options: [],
  needInstall: true,
  needDelivery: true,
};

const CONFIG: PriceConfig = {
  ...DEFAULT_PRICE_CONFIG,
  basePerM2: 40000,
  installPerM2: 5000,
  deliveryFlat: 8000,
  optionPrices: {
    'Москитная сетка': { type: 'fixed', value: 6000 },
    Подоконник: { type: 'perM2', value: 7000 },
  },
  roundTo: 100,
  rangePercent: 10,
};

describe('calculatePrice', () => {
  it('не считает цену, пока прайса нет — это защита от выдуманных цифр', () => {
    // basePerM2 = 0 в конфигурации по умолчанию
    expect(DEFAULT_PRICE_CONFIG.basePerM2).toBe(0);
    expect(calculatePrice(BASE_CALC, DEFAULT_PRICE_CONFIG)).toBeNull();
  });

  it('считает площадь и применяет минимальную площадь расчёта', () => {
    expect(areaOf(1400, 1500, 0)).toBeCloseTo(2.1, 5);
    // Маленькое окно 300×300 = 0.09 м², но минимум 0.5 м²
    expect(areaOf(300, 300, 0.5)).toBe(0.5);
  });

  it('складывает базу, надбавки за открывание и стеклопакет, опции и монтаж', () => {
    const result = calculatePrice(BASE_CALC, CONFIG);
    expect(result).not.toBeNull();

    const area = 2.1;
    const base = 40000 * area; // 84 000
    const openingExtra = base * (1.2 - 1); // поворотно-откидное
    const glazingExtra = base * (1.1 - 1); // двухкамерный
    const install = 5000 * area; // 10 500
    const delivery = 8000;

    const expected = Math.round((base + openingExtra + glazingExtra + install + delivery) / 100) * 100;
    expect(result!.total).toBe(expected);
  });

  it('учитывает количество конструкций', () => {
    const single = calculatePrice(BASE_CALC, CONFIG)!;
    const triple = calculatePrice({ ...BASE_CALC, quantity: 3 }, CONFIG)!;
    // Доставка входит один раз, поэтому утроение не ровно втрое
    expect(triple.total).toBeGreaterThan(single.total * 2.5);
    expect(triple.total).toBeLessThan(single.total * 3.1);
  });

  it('добавляет фиксированные и пометровые опции', () => {
    const withoutOptions = calculatePrice(BASE_CALC, CONFIG)!;
    const withOptions = calculatePrice({ ...BASE_CALC, options: ['Москитная сетка', 'Подоконник'] }, CONFIG)!;
    // 6000 фиксировано + 7000 × 2.1 м²
    expect(withOptions.total - withoutOptions.total).toBe(6000 + 7000 * 2.1);
  });

  it('не включает монтаж и доставку, если клиент их не выбрал', () => {
    const noInstall = calculatePrice({ ...BASE_CALC, needInstall: false, needDelivery: false }, CONFIG)!;
    const full = calculatePrice(BASE_CALC, CONFIG)!;
    expect(noInstall.total).toBeLessThan(full.total);
  });

  it('возвращает null на некорректных размерах вместо NaN', () => {
    expect(calculatePrice({ ...BASE_CALC, widthMm: 0 }, CONFIG)).toBeNull();
    expect(calculatePrice({ ...BASE_CALC, heightMm: -100 }, CONFIG)).toBeNull();
    expect(calculatePrice({ ...BASE_CALC, widthMm: Number.NaN }, CONFIG)).toBeNull();
  });

  it('отдаёт диапазон низ/верх относительно середины', () => {
    const result = calculatePrice(BASE_CALC, CONFIG)!;
    expect(result.low).toBeLessThan(result.total);
    expect(result.high).toBeGreaterThan(result.total);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });
});

describe('priceResponse', () => {
  it('в режиме off не отдаёт ни одного числа расчёта', () => {
    const result = calculatePrice(BASE_CALC, CONFIG)!;
    const response = priceResponse('off', result);

    expect(response.mode).toBe('off');
    // Ключевая проверка §18.5: в ответе нет ни low, ни high, ни суммы
    expect(JSON.stringify(response)).not.toMatch(/\d{3,}/);
  });

  it('в режиме range отдаёт диапазон с обязательной пометкой про замер', () => {
    const result = calculatePrice(BASE_CALC, CONFIG)!;
    const response = priceResponse('range', result);

    expect(response.mode).toBe('range');
    if (response.mode === 'range') {
      expect(response.low).toBeGreaterThan(0);
      expect(response.disclaimer).toContain('после замера');
    }
  });

  it('в режиме range без прайса остаётся off — не показываем ноль', () => {
    expect(priceResponse('range', null).mode).toBe('off');
  });
});

describe('calcPayloadSchema', () => {
  it('приводит строки к числам — форма присылает значения строками', () => {
    const parsed = calcPayloadSchema.parse({
      productType: 'okno-pvh',
      widthMm: '1400',
      heightMm: '1500',
      sections: '2',
      opening: 'turn',
      quantity: '1',
    });
    expect(parsed.widthMm).toBe(1400);
    expect(parsed.sections).toBe(2);
    expect(parsed.options).toEqual([]);
  });

  it('отклоняет нулевые и запредельные размеры с понятным текстом', () => {
    const tooSmall = calcPayloadSchema.safeParse({
      productType: 'okno-pvh',
      widthMm: 0,
      heightMm: 1500,
      sections: 1,
      opening: 'turn',
    });
    expect(tooSmall.success).toBe(false);
    if (!tooSmall.success) {
      expect(tooSmall.error.issues[0].message).toContain('200');
    }

    expect(
      calcPayloadSchema.safeParse({
        productType: 'okno-pvh',
        widthMm: 99000,
        heightMm: 1500,
        sections: 1,
        opening: 'turn',
      }).success,
    ).toBe(false);
  });
});
