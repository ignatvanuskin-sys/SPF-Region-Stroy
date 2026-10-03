/**
 * lib/lead-schema.ts — серверная zod-схема заявки (раздел 11.4).
 *
 * Файл импортируется ТОЛЬКО из app/api/lead/route.ts, чтобы zod не попадал
 * в браузерный бандл. Клиентская валидация дублирует правила вручную
 * (components/LeadForm.tsx + lib/validation.ts).
 */

import { z } from 'zod';

import {
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

export const leadSchema = z.object({
  mode: z.enum(['quick', 'details']).default('quick'),
  needs: z.enum(NEEDS, { message: 'needs_invalid' }),
  objectType: z.enum(OBJECT_TYPES).optional(),
  service: z.string().max(80).optional(),
  count: z.string().max(40).optional(),
  sizes: z.string().max(400).optional(),
  address: z.string().max(240).optional(),
  name: z.string().max(80).optional(),
  phone: phoneField,
  contactWay: z.enum(CONTACT_WAYS).optional(),
  comment: z.string().max(MAX_COMMENT).optional(),
  page: z.string().max(200).optional(),
  utm: z.string().max(600).optional(),
  consent: z
    .union([z.literal('on'), z.literal('true'), z.literal(true)])
    .transform(() => true),
  /** Скрытое поле-ловушка: должно быть пустым. */
  website: z.string().max(0, 'honeypot').optional().default(''),
});

export type LeadInput = z.infer<typeof leadSchema>;
