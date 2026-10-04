import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "2026-10-04T09:12:00Z" -> "04.10.2026 14:12" in the site timezone. */
export function formatDateTime(
  value: Date | string | number,
  timeZone = process.env.DEFAULT_TIMEZONE || 'Asia/Almaty',
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

/** "2026-10-04" -> "4 октября 2026" */
export function formatDateLong(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatTime(
  value: Date | string | number,
  timeZone = process.env.DEFAULT_TIMEZONE || 'Asia/Almaty',
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

/** Human-readable duration between two instants: "12 мин", "1 ч 05 мин". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return 'меньше минуты';
  if (totalMinutes < 60) return `${totalMinutes} мин`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
}

/** Trim and collapse whitespace; also strips characters used to fake length. */
export function cleanText(value: unknown, maxLength = 1000): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

/** "1 240 000" — used for prices only when PRICE_DISPLAY is not "off". */
export function formatMoney(amount: number, currency = '₸'): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}

export function absoluteUrl(path: string, siteUrl = process.env.SITE_URL || 'http://localhost:3000'): string {
  const base = siteUrl.replace(/\/+$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/** Plurals for Russian counters: pluralRu(5, 'заявка', 'заявки', 'заявок'). */
export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
