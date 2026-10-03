import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Стандартный помощник shadcn: склейка классов с разрешением конфликтов Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Форматирует телефон в читаемый вид: +7 701 893 67 87 */
export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}
