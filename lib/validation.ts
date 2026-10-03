/**
 * lib/validation.ts — константы и функции валидации заявки (раздел 11).
 *
 * ВАЖНО: этот модуль импортируется и на клиенте, поэтому он НЕ должен тянуть
 * zod в браузерный бандл. Серверная zod-схема лежит в lib/lead-schema.ts.
 */

export const NEEDS = [
  'Окна',
  'Двери',
  'Витражи и фасад',
  'Ремонт',
  'Вызвать замерщика',
  'Другое',
] as const;

export const OBJECT_TYPES = [
  'Квартира',
  'Частный дом',
  'Коммерческое помещение',
  'Другое',
] as const;

export const CONTACT_WAYS = ['whatsapp', 'call'] as const;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
] as const;

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ
export const MAX_COMMENT = 1000;

/** Приводит ввод к формату +7XXXXXXXXXX. Возвращает null, если номер не казахстанский. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('7')) return `+7${digits}`;
  return null;
}

/** Маска ввода: +7 XXX XXX XX XX */
export function formatPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  const groups = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)].filter(
    Boolean,
  );
  return `+7${groups.length ? ` ${groups.join(' ')}` : ''}`;
}

/** Проверка телефона без zod — используется и клиентом, и сервером. */
export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Человеческое сообщение об ошибке для конкретного поля (таблица 11.3). */
export function fieldErrorText(code: string | undefined): string {
  switch (code) {
    case 'phone_invalid':
    case 'phone_required':
      return 'Введите телефон в формате +7 XXX XXX XX XX';
    case 'needs_invalid':
      return 'Выберите, что вам нужно';
    case 'consent':
      return 'Нужно согласие на обработку персональных данных';
    default:
      return 'Проверьте поле';
  }
}

export const PHONE_ERROR_TEXT = 'Введите телефон в формате +7 XXX XXX XX XX';
