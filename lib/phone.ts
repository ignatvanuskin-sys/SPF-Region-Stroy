/**
 * Phone normalisation for Kazakhstan numbers.
 *
 * The site receives numbers typed by humans in every shape: "8 701 893 67 87",
 * "+7 (701) 893-67-87", "7018936787", "8(701)8936787". All of them must land in
 * one canonical form `+7XXXXXXXXXX` so that de-duplication by phone works.
 *
 * Country code +7 is shared with Russia, so we do not try to guess the country
 * from the prefix — we only validate the shape. KZ landline codes (for example
 * Astana 7172) are accepted because the company may be reached from one.
 */

export const PHONE_PATTERN = /^\+7\d{10}$/;

/** KZ mobile ranges used by local operators: 700–708, 747, 750–751, 760–763, 771, 775–778. */
const KZ_MOBILE_PATTERN = /^\+77(0[0-8]|4[17]|5[01]|6[0-3]|7[15678])\d{7}$/;

/**
 * Правдоподобные городские номера Казахстана: 6xxx (операторы связи) и
 * 7[0-2]xx (коды городов, например Астана 7172).
 * Нужны, чтобы отсечь «+7 000 000 00 00» — по форме номер верный, а по смыслу нет.
 */
const KZ_LANDLINE_PATTERN = /^(6\d{9}|7[0-2]\d{8})$/;

/**
 * Returns the canonical `+7XXXXXXXXXX` form, or `null` when the input cannot be
 * a valid number (too short, too long, or a clearly fake run of digits).
 */
export function normalizeKzPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  let digits = input.replace(/\D/g, '');

  // International dialling prefix "00" instead of "+"
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Trunk prefix 8 -> 7 (only when it is really a trunk prefix, not part of a longer number)
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;

  // Local 10-digit form without the country code: «701 893 67 87» и «7172 55 33 22».
  if (digits.length === 10) digits = `7${digits}`;

  if (digits.length !== 11 || !digits.startsWith('7')) return null;

  const normalized = `+${digits}`;
  if (!PHONE_PATTERN.test(normalized)) return null;

  // Проверяем не только форму, но и правдоподобность кода: серия из нулей или
  // другого повторяющегося символа — это заведомо неверный ввод, а не клиент.
  const national = digits.slice(1);
  const plausible = KZ_MOBILE_PATTERN.test(normalized) || KZ_LANDLINE_PATTERN.test(national);
  if (!plausible) return null;

  return normalized;
}

export function isValidKzPhone(input: unknown): boolean {
  const normalized = normalizeKzPhone(input);
  return normalized !== null && KZ_MOBILE_PATTERN.test(normalized);
}

/** "+77018936787" -> "+7 701 893 67 87" */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return phone;
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

/**
 * Digits only, for wa.me links: "+77018936787" -> "77018936787".
 */
export function phoneToWaId(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * "+77018936787" -> "+7701***6787". Used in logs and notification text so that
 * personal data is not written in the clear (master prompt §15).
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '***';
  return `+${digits.slice(0, 4)}***${digits.slice(-4)}`;
}
