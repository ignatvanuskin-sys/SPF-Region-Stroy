/**
 * lib/lead-schema.ts — серверная zod-схема заявки.
 *
 * Импортируется ТОЛЬКО из app/api/lead/route.ts, чтобы zod не попадал
 * в браузерный бандл. Клиентская валидация дублирует правила вручную
 * (components/LeadForm.tsx + lib/validation.ts).
 */

import { z } from 'zod';

import {
  CATEGORY_VALUES,
  CONTACT_WAYS,
  MAX_COMMENT,
  NEEDS,
  OBJECT_TYPES,
  normalizePhone,
} from '@/lib/validation';

const phoneField = z
  .string()
  .min(1, 'phone_required')
  .transform((v) => normalizePhone(v))
  .refine((v): v is string => v !== null, { message: 'phone_invalid' });

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

export const leadSchema = z.object({
  mode: z.enum(['quick', 'details']).default('quick'),
  /** Первый шаг воронки: что нужно клиенту. */
  category: z.enum(CATEGORY_VALUES as [string, ...string[]], { message: 'category_invalid' }),
  /** Совместимость со старой формой: список потребностей. */
  needs: z.enum(NEEDS, { message: 'needs_invalid' }).optional(),
  objectType: z.enum(OBJECT_TYPES).optional(),
  service: optionalTrimmed(80),
  count: optionalTrimmed(40),
  sizes: optionalTrimmed(400),
  address: optionalTrimmed(240),
  name: optionalTrimmed(80),
  phone: phoneField,
  email: z
    .string()
    .max(160)
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined))
    .refine((v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
      message: 'email_invalid',
    }),
  contactWay: z.enum(CONTACT_WAYS).optional(),
  comment: optionalTrimmed(MAX_COMMENT),
  /** Желаемый слот замера (ISO). Проверяется по сетке в lib/pipeline/schedule. */
  measurementSlot: optionalTrimmed(40),
  page: optionalTrimmed(200),
  utm: optionalTrimmed(600),
  consent: z
    .union([z.literal('on'), z.literal('true'), z.literal(true)])
    .transform(() => true),
  /** Скрытое поле-ловушка: должно быть пустым. */
  website: z.string().max(0, 'honeypot').optional().default(''),
});

export type LeadInput = z.infer<typeof leadSchema>;
