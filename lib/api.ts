/**
 * Общие помощники HTTP-слоя: единый формат ответов и ошибок, определение
 * клиента, защита cron-эндпоинтов, проверка Cloudflare Turnstile.
 *
 * Единый формат ошибки (§12): { error: { code, message, details? } }.
 * Тексты — на русском, потому что их показывает клиенту форма.
 */

import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { firstError } from '@/lib/validation';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

export function json<T>(data: T, status = 200, headers?: HeadersInit): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: { 'cache-control': 'no-store', ...headers },
  });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  extra?: { field?: string; details?: unknown },
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

export function validationError(error: ZodError): NextResponse<ApiErrorBody> {
  const { field, message } = firstError(error);
  return apiError('validation_error', message, 422, {
    field,
    details: error.issues.slice(0, 8).map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

export function rateLimited(retryAfterSec: number): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code: 'rate_limited', message: 'Слишком много заявок. Попробуйте через минуту.' } },
    { status: 429, headers: { 'retry-after': String(retryAfterSec), 'cache-control': 'no-store' } },
  );
}

/** IP клиента за прокси; X-Forwarded-For перечисляет через запятую. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // навигационные запросы без Origin
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('host');
    return originHost === requestHost;
  } catch {
    return false;
  }
}

/** Защита служебных эндпоинтов cron (§12). */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  return header === `Bearer ${secret}`;
}

export function cronUnauthorized(): NextResponse<ApiErrorBody> {
  return apiError('unauthorized', 'Неверный секрет планировщика', 401);
}

/**
 * Cloudflare Turnstile — опциональная антиспам-проверка (§8.1, шаг 2).
 * Без ключей сайт работает без неё: это осознанное решение, а не ошибка.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = (await response.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    // Недоступность Cloudflare не должна блокировать реальные заявки:
    // остальные антиспам-барьеры (honeypot, тайминг, лимиты) продолжают работать.
    console.warn('[turnstile] проверка недоступна, пропускаем заявку');
    return true;
  }
}

/**
 * Эвристика против ботов, не требующая внешнего сервиса: скрытое поле
 * заполнено или форму отправили подозрительно быстро.
 */
export function looksLikeBot(input: { honeypot?: string; elapsedMs?: number }): boolean {
  if (input.honeypot && input.honeypot.length > 0) return true;
  if (typeof input.elapsedMs === 'number' && input.elapsedMs > 0 && input.elapsedMs < 1200) return true;
  return false;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
