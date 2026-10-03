/**
 * lib/analytics.ts — события аналитики.
 *
 * Правила:
 *  - аналитика не стартует до согласия на cookies;
 *  - отказ полностью отключает загрузку скриптов;
 *  - события не содержат персональных данных: ни телефона, ни имени, ни текста
 *    комментария. Только обезличенные признаки (тип объекта, услуга, шаг).
 *  - без настроенных NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_YM_ID скрипты не грузятся.
 */

'use client';

/**
 * Обязательный набор событий:
 *   click_phone      — клик по телефону
 *   click_whatsapp   — клик по WhatsApp
 *   quiz_start       — начало квиза
 *   quiz_complete    — завершение квиза
 *   photo_upload     — загрузка фотографии
 *   form_submit      — отправка заявки
 *   service_view     — просмотр услуги
 *   case_view        — просмотр кейса
 *   click_2gis       — клик по 2ГИС
 */
export type AnalyticsEvent =
  | 'click_phone'
  | 'click_whatsapp'
  | 'click_email'
  | 'click_2gis'
  | 'click_map_route'
  | 'quiz_start'
  | 'quiz_step'
  | 'quiz_complete'
  | 'photo_upload'
  | 'form_submit'
  | 'form_success'
  | 'form_error'
  | 'service_view'
  | 'case_view'
  | 'object_select'
  | 'faq_open'
  | 'lang_switch';

export type Placement =
  | 'header'
  | 'hero'
  | 'sticky'
  | 'form'
  | 'footer'
  | 'contacts'
  | 'section'
  | 'thanks'
  | 'error_page'
  | 'service_page'
  | 'portfolio'
  | 'privacy'
  | 'inline';

export type WaContextName = 'general' | 'calculation' | 'measurement' | 'service' | 'case';

export type EventParams = Record<string, string | number | boolean | undefined>;

export type ConsentState = 'accepted' | 'declined' | null;

const CONSENT_KEY = 'spf_cookie_consent';

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(value: Exclude<ConsentState, null>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Приватный режим: согласие не сохранится, но аналитика не включится.
  }
  window.dispatchEvent(new CustomEvent('spf:consent', { detail: value }));
}

interface AnalyticsWindow extends Window {
  gtag?: (...args: unknown[]) => void;
  ym?: (id: number, action: string, ...rest: unknown[]) => void;
  dataLayer?: unknown[];
}

/** Отправка события. Молча ничего не делает без согласия и без настроенных счётчиков. */
export function track(event: AnalyticsEvent, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;
  if (getConsent() !== 'accepted') return;

  const w = window as AnalyticsWindow;
  const payload = { event, ...params };

  try {
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, params);
    }
    if (typeof w.ym === 'function') {
      const id = Number(process.env.NEXT_PUBLIC_YM_ID ?? '0');
      if (id) w.ym(id, 'reachGoal', event, params);
    }
    w.dataLayer?.push(payload);
  } catch {
    // Аналитика не должна ломать интерфейс.
  }
}
