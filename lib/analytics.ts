/**
 * lib/analytics.ts — события раздела 20.
 *
 * Правила:
 *  - аналитика НЕ стартует до согласия на cookies;
 *  - отказ полностью отключает аналитику;
 *  - события не содержат персональных данных (телефон, имя, комментарий).
 *  - без настроенных GA_ID / YM_ID скрипты не загружаются вообще.
 */

'use client';

export type AnalyticsEvent =
  | 'click_phone'
  | 'click_whatsapp'
  | 'click_email'
  | 'click_instagram'
  | 'click_2gis'
  | 'click_map_route'
  | 'scenario_select'
  | 'form_start'
  | 'form_submit'
  | 'form_success'
  | 'form_error'
  | 'file_attached'
  | 'faq_open'
  | 'lang_switch';

export type Placement =
  | 'header'
  | 'sticky'
  | 'hero'
  | 'contacts'
  | 'footer'
  | 'service_page'
  | 'thanks'
  | 'error_page';

export type WaContextName = 'general' | 'calculation' | 'measurement' | 'service' | 'case';

export interface EventParams {
  placement?: Placement;
  page?: string;
  context?: WaContextName;
  scenario?: string;
  question_id?: string;
  count?: number;
  form?: 'quick' | 'details';
  service?: string;
  reason?: string;
  to?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

const CONSENT_KEY = 'spf_cookie_consent';

export type ConsentValue = 'accepted' | 'declined' | null;

export function getConsent(): ConsentValue {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Exclude<ConsentValue, null>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* приватный режим — молча игнорируем */
  }
  window.dispatchEvent(new CustomEvent('spf:consent', { detail: value }));
}

export function isAnalyticsEnabled(): boolean {
  return getConsent() === 'accepted';
}

type GtagFn = (...args: unknown[]) => void;
type YmFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    ym?: YmFn;
    __spfGaId?: string;
    __spfYmId?: string;
  }
}

/** Отправляет событие, если аналитика разрешена и настроена. */
export function track(event: AnalyticsEvent, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;

  const page = params.page ?? window.location.pathname;
  const payload = { ...params, page };

  try {
    if (typeof window.gtag === 'function' && window.__spfGaId) {
      window.gtag('event', event, payload);
    }
    if (typeof window.ym === 'function' && window.__spfYmId) {
      window.ym(Number(window.__spfYmId), 'reachGoal', event, payload);
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  } catch {
    /* аналитика никогда не должна ломать интерфейс */
  }
}

export const CONVERSION_EVENTS: AnalyticsEvent[] = [
  'click_phone',
  'click_whatsapp',
  'form_success',
];
