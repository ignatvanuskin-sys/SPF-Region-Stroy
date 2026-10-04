/**
 * Предварительный расчёт стоимости (master prompt §8.2).
 *
 * Все коэффициенты живут в настройках (`price_rules`) и правятся в админке —
 * в коде нет ни одной цифры. Пока владелец не дал прайс, работает режим
 * `off`: страница не получает цену вообще, ни в интерфейсе, ни в ответе API.
 *
 * Формула: базовая_цена_за_м² × площадь × коэффициент_типа
 *          + коэффициенты створок/открывания/стеклопакета
 *          + опции (фиксированные и за м²)
 *          + монтаж + доставка,
 * затем минимальная площадь, округление и диапазон ±N %.
 */

import type { CalcPayload } from '@/lib/validation';

export interface PriceConfig {
  currency: string;
  /** Базовая цена за м². 0 = прайса нет, расчёт не показываем. */
  basePerM2: number;
  typeCoefficients: Record<string, number>;
  openingCoefficients: Record<string, number>;
  glazingCoefficients: Record<string, number>;
  optionPrices: Record<string, { type: 'fixed' | 'perM2'; value: number }>;
  installPerM2: number;
  deliveryFlat: number;
  minAreaM2: number;
  roundTo: number;
  /** Полуширина диапазона в процентах, например 12 → «±12 %». */
  rangePercent: number;
}

/**
 * Стартовые значения — ДЕМОНСТРАЦИОННЫЕ и помечены в админке как «заполнить
 * владельцем». basePerM2 = 0 означает, что цена не считается: пока владелец не
 * дал прайс, сайт не показывает никаких сумм (§3.6).
 */
export const DEFAULT_PRICE_CONFIG: PriceConfig = {
  currency: 'KZT',
  basePerM2: 0,
  typeCoefficients: {
    'okno-pvh': 1,
    'okno-alyum': 1.35,
    vitrazh: 1.6,
    dver: 1.5,
    peregorodka: 1.3,
    balkon: 1.1,
  },
  openingCoefficients: { fixed: 1, turn: 1.12, 'tilt-turn': 1.2, sliding: 1.25 },
  glazingCoefficients: {
    Однокамерный: 1,
    Двухкамерный: 1.1,
    'Двухкамерный энергосберегающий': 1.22,
    'Трёхкамерный': 1.3,
  },
  optionPrices: {
    'Москитная сетка': { type: 'fixed', value: 0 },
    Подоконник: { type: 'perM2', value: 0 },
    Отлив: { type: 'perM2', value: 0 },
    Откосы: { type: 'perM2', value: 0 },
  },
  installPerM2: 0,
  deliveryFlat: 0,
  minAreaM2: 0.5,
  roundTo: 100,
  rangePercent: 12,
};

export interface PriceResult {
  /** Ориентировочная сумма по формуле. */
  total: number;
  low: number;
  high: number;
  currency: string;
  breakdown: { label: string; amount: number }[];
}

export function areaOf(widthMm: number, heightMm: number, minAreaM2: number): number {
  const raw = (widthMm / 1000) * (heightMm / 1000);
  return Math.max(raw, minAreaM2);
}

function roundTo(value: number, step: number): number {
  if (step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

/**
 * Считает ориентировочную стоимость. Возвращает `null`, если прайса нет —
 * тогда вызывающий код обязан показать «стоимость рассчитает менеджер».
 */
export function calculatePrice(calc: CalcPayload, config: PriceConfig): PriceResult | null {
  if (!config.basePerM2 || config.basePerM2 <= 0) return null;
  if (!Number.isFinite(calc.widthMm) || !Number.isFinite(calc.heightMm)) return null;
  if (calc.widthMm <= 0 || calc.heightMm <= 0) return null;

  const area = areaOf(calc.widthMm, calc.heightMm, config.minAreaM2);
  const breakdown: { label: string; amount: number }[] = [];

  const typeCoefficient = config.typeCoefficients[calc.productType] ?? 1;
  const base = config.basePerM2 * area * typeCoefficient;
  breakdown.push({ label: `Конструкция (${area.toFixed(2)} м²)`, amount: base });

  const openingCoefficient = config.openingCoefficients[calc.opening] ?? 1;
  const openingExtra = base * (openingCoefficient - 1);
  if (openingExtra > 0) {
    breakdown.push({ label: 'Тип открывания', amount: openingExtra });
  }

  const glazingCoefficient = config.glazingCoefficients[calc.glazing] ?? 1;
  const glazingExtra = base * (glazingCoefficient - 1);
  if (glazingExtra > 0) {
    breakdown.push({ label: 'Стеклопакет', amount: glazingExtra });
  }

  let optionsSum = 0;
  for (const option of calc.options ?? []) {
    const rule = config.optionPrices[option];
    if (!rule) continue;
    const amount = rule.type === 'perM2' ? rule.value * area : rule.value;
    if (amount > 0) {
      optionsSum += amount;
      breakdown.push({ label: option, amount });
    }
  }

  if (calc.needInstall && config.installPerM2 > 0) {
    const install = config.installPerM2 * area;
    breakdown.push({ label: 'Монтаж', amount: install });
  }

  let delivery = 0;
  if (calc.needDelivery && config.deliveryFlat > 0) {
    delivery = config.deliveryFlat;
  }

  const perUnit = breakdown.reduce((sum, item) => sum + item.amount, 0) + delivery;
  const total = roundTo(perUnit * Math.max(1, calc.quantity), config.roundTo);
  const spread = total * (config.rangePercent / 100);

  return {
    total,
    low: roundTo(total - spread, config.roundTo),
    high: roundTo(total + spread, config.roundTo),
    currency: config.currency,
    breakdown,
  };
}

/**
 * Ответ API в режиме `off` не должен содержать ни одного числа расчёта —
 * это проверяется тестом (§18, критерий 5). Функция собирает «безопасный»
 * результат: только подтверждение, что заявка принята.
 */
export function priceResponse(
  priceDisplay: 'off' | 'range',
  price: PriceResult | null,
): { mode: 'off' } | { mode: 'range'; low: number; high: number; currency: string; disclaimer: string } {
  if (priceDisplay === 'off' || !price) return { mode: 'off' };
  return {
    mode: 'range',
    low: price.low,
    high: price.high,
    currency: price.currency,
    disclaimer: 'Точная стоимость определяется после замера',
  };
}

export const PRICE_DISCLAIMER_OFF = 'Точную стоимость рассчитает менеджер после уточнения параметров или замера.';
