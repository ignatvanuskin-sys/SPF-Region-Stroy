'use client';

/**
 * Клиентская аналитика и атрибуция (master prompt §8.6, §8.7).
 *
 * Правила:
 *  • источник и UTM хранятся 30 дней, чтобы клиент, вернувшийся позже, всё
 *    равно был засчитан тому каналу, который его привёл;
 *  • клики по tel:/wa.me фиксируются через navigator.sendBeacon — запрос
 *    успевает уйти до того, как браузер начнёт переход;
 *  • сторонние счётчики (Яндекс.Метрика, GA4, Meta) подключаются только после
 *    согласия на cookie. Собственные события сайта — обезличенные: путь,
 *    имя события, идентификатор сессии, без телефонов и имён.
 */

const ATTRIBUTION_KEY = 'spf_attribution_v1';
const SESSION_KEY = 'spf_session_id';
const ATTRIBUTION_TTL_MS = 30 * 24 * 3600_000;

export interface Attribution {
  src?: string;
  utm: Record<string, string>;
  referrer?: string;
  landingPath?: string;
  firstSeenAt: string;
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Устойчивый идентификатор сессии — нужен, чтобы связать события одного визита. */
export function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return 'anonymous';
  }
}

/**
 * Считывает параметры входа из адресной строки и запоминает их.
 * Не перезаписывает уже сохранённые данные, если в текущем заходе меток нет:
 * иначе прямой переход «обнулял» бы источник.
 */
export function captureAttribution(): Attribution {
  const fallback: Attribution = { utm: {}, firstSeenAt: new Date().toISOString() };
  const store = safeLocalStorage();
  if (!store) return fallback;

  let stored: Attribution | null = null;
  try {
    const raw = store.getItem(ATTRIBUTION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Attribution & { savedAt?: number };
      if (!parsed.savedAt || Date.now() - parsed.savedAt < ATTRIBUTION_TTL_MS) {
        stored = parsed;
      }
    }
  } catch {
    stored = null;
  }

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  const src = params.get('src') || undefined;
  const hasFresh = Boolean(src) || Object.keys(utm).length > 0;

  const next: Attribution = {
    src: src ?? stored?.src,
    utm: hasFresh ? utm : stored?.utm ?? {},
    referrer: stored?.referrer || document.referrer || undefined,
    landingPath: stored?.landingPath || window.location.pathname,
    firstSeenAt: stored?.firstSeenAt ?? new Date().toISOString(),
  };

  try {
    store.setItem(ATTRIBUTION_KEY, JSON.stringify({ ...next, savedAt: Date.now() }));
  } catch {
    // Приватный режим: атрибуция просто не сохранится, заявка отправится как direct.
  }

  return next;
}

export function getAttribution(): Attribution {
  const store = safeLocalStorage();
  if (store) {
    try {
      const raw = store.getItem(ATTRIBUTION_KEY);
      if (raw) return JSON.parse(raw) as Attribution;
    } catch {
      // игнорируем и вычисляем заново
    }
  }
  return captureAttribution();
}

/** Поля атрибуции для тела заявки. */
export function attributionFields(): Record<string, string> {
  const attribution = getAttribution();
  const fields: Record<string, string> = {};
  if (attribution.src) fields.src = attribution.src;
  for (const [key, value] of Object.entries(attribution.utm || {})) {
    if (value) fields[key] = value;
  }
  if (attribution.referrer) fields.referrer = attribution.referrer;
  if (attribution.landingPath) fields.landing_path = attribution.landingPath;
  fields.request_path = typeof window === 'undefined' ? '/' : window.location.pathname;
  fields.locale = document.documentElement.lang || 'ru';
  return fields;
}

type EventProps = Record<string, string | number | boolean | undefined>;

/** Отправляет событие на наш эндпоинт. Ничего не блокирует и не бросает. */
export function track(name: string, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify({
    events: [
      {
        name,
        path: window.location.pathname,
        sessionId: getSessionId(),
        props: Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)),
        ts: new Date().toISOString(),
      },
    ],
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
    } else {
      void fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // Аналитика не должна ломать интерфейс.
  }

  // Сторонние счётчики — только после согласия.
  if (hasAnalyticsConsent()) {
    const w = window as unknown as {
      ym?: (id: number, action: string, target: string) => void;
      gtag?: (...args: unknown[]) => void;
      fbq?: (...args: unknown[]) => void;
    };
    try {
      if (w.ym && process.env.NEXT_PUBLIC_YM_COUNTER_ID) {
        w.ym(Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID), 'reachGoal', name);
      }
      w.gtag?.('event', name, props);
      w.fbq?.('trackCustom', name, props);
    } catch {
      // внешние счётчики не обязаны работать
    }
  }
}

/**
 * Клик по tel: или wa.me: сначала отправляем событие, потом переходим.
 * sendBeacon не задерживает навигацию, поэтому переход происходит сразу.
 */
export function trackClick(
  name: string,
  href: string,
  props: EventProps = {},
): void {
  track(name, { ...props, href });
  void href;
}

export const CONSENT_KEY = 'spf_cookie_consent_v1';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
}

export function readConsent(): CookieConsent | null {
  const store = safeLocalStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean): CookieConsent {
  const consent: CookieConsent = { necessary: true, analytics, decidedAt: new Date().toISOString() };
  try {
    safeLocalStorage()?.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Приватный режим — согласие не сохранится, аналитика останется выключенной.
  }
  window.dispatchEvent(new CustomEvent('spf:consent', { detail: consent }));
  return consent;
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}
