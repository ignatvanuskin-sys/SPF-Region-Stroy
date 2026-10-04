/**
 * Сессии админки (§9).
 *
 * Подписанный HMAC-SHA256 токен в httpOnly-cookie: без подписи SESSION_SECRET
 * подделать нельзя, JavaScript до cookie не достаёт (защита от XSS-кражи).
 * Срок жизни — 7 дней, `sameSite: lax` — базовая защита от CSRF.
 *
 * Пароли хранятся только в виде bcrypt-хеша.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import type { AdminUser, UserRole } from '@/lib/db/types';
import { getStore } from '@/lib/db';

export const SESSION_COOKIE = 'spf_session';
const SESSION_TTL_MS = 7 * 24 * 3600_000;

export interface SessionPayload {
  userId: number;
  email: string;
  role: UserRole;
  /** Менялся ли пароль — пока false, показываем экран смены пароля. */
  mustChangePassword: boolean;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    // В разработке позволяем запуститься, но громко предупреждаем.
    if (process.env.NODE_ENV !== 'production') {
      return 'dev-only-insecure-session-secret-change-me';
    }
    throw new Error('SESSION_SECRET не задан или слишком короткий (минимум 16 символов)');
  }
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signSession(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload?.userId || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createUserSession(user: AdminUser): Promise<void> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Текущий пользователь или null. Читает БД, чтобы учитывать смену роли. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await getStore().getUser(payload.userId);
  return user ?? null;
}

export async function requireUser(roles?: UserRole[]): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

// ------------------------------------------------------------------ пароли

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function generateInviteCode(): string {
  return randomBytes(6).toString('hex').toUpperCase();
}

export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}
