/**
 * lib/utm.ts — UTM-метки первого визита (раздел 11.4).
 * Хранение в sessionStorage обязательно в try/catch: приватный режим
 * и отключённое хранилище не должны ломать страницу.
 */

'use client';

export interface Utm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const UTM_KEY = 'spf_utm_first_touch';
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

/** Сохраняет UTM первого визита. Повторные визиты не перезаписывают значения. */
export function captureUtm(): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = window.sessionStorage.getItem(UTM_KEY);
    if (existing) return;

    const params = new URLSearchParams(window.location.search);
    const found: Utm = {};
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) found[key] = value.slice(0, 120);
    }
    if (Object.keys(found).length > 0) {
      window.sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
    }
  } catch {
    /* нет доступа к sessionStorage — просто пропускаем */
  }
}

export function readUtm(): Utm {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(UTM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Utm;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function utmForLead(): string {
  const utm = readUtm();
  const parts = UTM_KEYS.filter((k) => utm[k]).map((k) => `${k}=${utm[k]}`);
  return parts.length > 0 ? parts.join(', ') : 'нет';
}
