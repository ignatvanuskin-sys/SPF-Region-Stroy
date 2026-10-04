/**
 * Валидация форм. Одни и те же схемы используются на клиенте (мгновенная
 * подсказка) и на сервере (источник истины) — §8.1, шаг 1.
 *
 * Поля, которые видит клиент, называются по-человечески; технические поля
 * (submissionId, honeypot, атрибуция) в интерфейсе не показываются.
 */

import { z } from 'zod';
import { normalizeKzPhone } from '@/lib/phone';

/**
 * Версия текста согласия. Меняется при правке формулировки — старые лиды
 * сохраняют ту версию, которую человек реально видел (§15).
 */
export const CONSENT_TEXT_VERSION = '2026-10-04-v1';

export const CONSENT_TEXT =
  'Согласен на обработку персональных данных: имя и телефон нужны, чтобы связаться со мной и подготовить расчёт.';

const phoneField = z
  .string()
  .trim()
  .min(1, 'Укажите телефон')
  .transform((value, ctx) => {
    const normalized = normalizeKzPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Проверьте номер: нужен казахстанский номер в формате +7 7XX XXX XX XX',
      });
      return z.NEVER;
    }
    return normalized;
  });

const nameField = z
  .string()
  .trim()
  .min(2, 'Как к вам обращаться? Минимум 2 символа')
  .max(80, 'Слишком длинное имя')
  .refine((value) => !/https?:\/\/|www\./i.test(value), 'Имя не должно содержать ссылок');

const attributionFields = {
  src: z.string().trim().max(60).optional(),
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
  utm_content: z.string().trim().max(120).optional(),
  utm_term: z.string().trim().max(120).optional(),
  referrer: z.string().trim().max(500).optional(),
  landing_path: z.string().trim().max(300).optional(),
  request_path: z.string().trim().max(300).optional(),
  locale: z.string().trim().max(10).optional(),
};

const antiSpamFields = {
  /** Скрытое поле: люди его не видят, боты заполняют. */
  honeypot: z.string().max(0, 'Заявка отклонена').optional().or(z.literal('')),
  /** UUID отправки — защита от дублей при двойном клике (§8.1). */
  submissionId: z.string().uuid('Некорректный идентификатор отправки'),
  /** Сколько миллисекунд человек провёл на форме: мгновенная отправка = бот. */
  elapsedMs: z.coerce.number().int().min(0).optional(),
  turnstileToken: z.string().max(2000).optional(),
};

const consentField = z.literal(true, {
  errorMap: () => ({ message: 'Отметьте согласие на обработку персональных данных' }),
});

export const PRODUCT_TYPE_VALUES = [
  'okno-pvh',
  'okno-alyum',
  'vitrazh',
  'dver',
  'peregorodka',
  'balkon',
  'remont',
  'other',
] as const;

/** Быстрая заявка: 3 поля и кнопка (§6.1, блок 7). */
export const quickLeadSchema = z.object({
  formType: z.literal('quick'),
  name: nameField,
  phone: phoneField,
  productType: z.enum(PRODUCT_TYPE_VALUES, {
    errorMap: () => ({ message: 'Выберите, что вам нужно' }),
  }),
  district: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(1000).optional(),
  consent: consentField,
  ...attributionFields,
  ...antiSpamFields,
});

/** Заявка со страницы услуги — то же плюс, откуда пришла. */
export const serviceLeadSchema = quickLeadSchema.extend({
  formType: z.literal('service'),
  serviceSlug: z.string().trim().max(80).optional(),
});

export const CALC_PRODUCT_VALUES = [
  'okno-pvh',
  'okno-alyum',
  'vitrazh',
  'dver',
  'peregorodka',
  'balkon',
] as const;

export const OPENING_TYPES = ['fixed', 'turn', 'tilt-turn', 'sliding'] as const;

/**
 * Конфигурация из калькулятора. Размеры ограничены разумными рамками, чтобы
 * «0» или «999999» не превращались в NaN и не ломали расчёт (§8.2, страховка).
 */
export const calcPayloadSchema = z.object({
  productType: z.enum(CALC_PRODUCT_VALUES),
  widthMm: z.coerce
    .number()
    .int()
    .min(200, 'Ширина от 200 мм')
    .max(20000, 'Ширина до 20 000 мм — для больших конструкций позвоните нам'),
  heightMm: z.coerce
    .number()
    .int()
    .min(200, 'Высота от 200 мм')
    .max(20000, 'Высота до 20 000 мм — для больших конструкций позвоните нам'),
  sections: z.coerce.number().int().min(1).max(12),
  opening: z.enum(OPENING_TYPES),
  quantity: z.coerce.number().int().min(1).max(200),
  color: z.string().trim().max(60).default('Белый'),
  glazing: z.string().trim().max(60).default('Двухкамерный'),
  options: z.array(z.string().trim().max(60)).max(20).default([]),
  needInstall: z.boolean().default(true),
  needDelivery: z.boolean().default(true),
  desiredTiming: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const calculatorLeadSchema = z.object({
  formType: z.literal('calculator'),
  name: nameField,
  phone: phoneField,
  district: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(1000).optional(),
  contactChannel: z.enum(['call', 'whatsapp']).default('call'),
  calc: calcPayloadSchema,
  consent: consentField,
  ...attributionFields,
  ...antiSpamFields,
});

const optionalAddress = {
  street: z.string().trim().max(120).optional(),
  house: z.string().trim().max(40).optional(),
  flat: z.string().trim().max(40).optional(),
};

/** Запрос на замер (§8.3). Без SMS-подтверждения это именно запрос, не запись. */
export const measurementRequestSchema = z.object({
  formType: z.literal('measurement'),
  name: nameField,
  phone: phoneField,
  district: z.string().trim().min(1, 'Выберите район'),
  ...optionalAddress,
  productType: z.enum(PRODUCT_TYPE_VALUES),
  /** ISO-строка слота в UTC. */
  startsAt: z.string().datetime({ message: 'Выберите дату и время' }),
  comment: z.string().trim().max(1000).optional(),
  consent: consentField,
  ...attributionFields,
  ...antiSpamFields,
});

/** Запрос для организаций (§6.4): метка segment=b2b и повышенный приоритет. */
export const b2bRequestSchema = z.object({
  formType: z.literal('b2b'),
  organization: z
    .string()
    .trim()
    .min(2, 'Укажите название организации')
    .max(160, 'Слишком длинное название'),
  name: nameField,
  phone: phoneField,
  email: z.string().trim().email('Проверьте e-mail').max(160).optional().or(z.literal('')),
  objectType: z.string().trim().max(120).optional(),
  volume: z.string().trim().max(200).optional(),
  deadline: z.string().trim().max(120).optional(),
  productType: z.enum(PRODUCT_TYPE_VALUES).default('other'),
  comment: z.string().trim().max(2000).optional(),
  fileName: z.string().trim().max(255).optional(),
  fileKey: z.string().trim().max(255).optional(),
  consent: consentField,
  ...attributionFields,
  ...antiSpamFields,
});

export const leadSchema = z.discriminatedUnion('formType', [
  quickLeadSchema,
  serviceLeadSchema,
  calculatorLeadSchema,
  measurementRequestSchema,
  b2bRequestSchema,
]);

export type LeadInput = z.infer<typeof leadSchema>;
export type QuickLeadInput = z.infer<typeof quickLeadSchema>;
export type CalculatorLeadInput = z.infer<typeof calculatorLeadSchema>;
export type MeasurementRequestInput = z.infer<typeof measurementRequestSchema>;
export type B2BRequestInput = z.infer<typeof b2bRequestSchema>;
export type CalcPayload = z.infer<typeof calcPayloadSchema>;

/** Событие аналитики (§8.7). Батч, без персональных данных. */
export const eventsSchema = z.object({
  events: z
    .array(
      z.object({
        name: z.string().trim().max(60),
        path: z.string().trim().max(300).optional(),
        sessionId: z.string().trim().max(64).optional(),
        props: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
        ts: z.string().trim().max(40).optional(),
      }),
    )
    .min(1)
    .max(30),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email('Введите e-mail'),
  password: z.string().min(8, 'Пароль минимум 8 символов').max(200),
});

export const claimUpdateSchema = z.object({
  key: z.string().trim().min(1).max(80),
  textRu: z.string().trim().max(500),
  status: z.enum(['confirmed', 'unconfirmed']),
});

/**
 * Человеческий текст первой ошибки — для подписи под полем на русском.
 */
export function firstError(error: z.ZodError): { field: string; message: string } {
  const issue = error.issues[0];
  return {
    field: String(issue?.path?.[0] ?? 'form'),
    message: issue?.message ?? 'Проверьте заполненные поля',
  };
}
