/**
 * lib/whatsapp.ts — сборка ссылок wa.me (раздел 7).
 *
 * Всегда добавляем пометку «с сайта», чтобы менеджер видел источник заявки.
 * Тексты — строго из таблицы раздела 7, без самодеятельности.
 */

import { CONTACTS } from '@/content/contacts';

export type WaContext =
  | 'general'
  | 'calculation'
  | 'measurement'
  | 'service'
  | 'case';

/** Номер из wa.me-ссылки F05: https://wa.me/77018936787 */
export const WA_NUMBER = CONTACTS.whatsapp.replace('https://wa.me/', '');

export const WA_BASE = `https://wa.me/${WA_NUMBER}`;

export const WA_TEXTS: Record<WaContext, string> = {
  general: 'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу получить консультацию.',
  calculation:
    'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу узнать стоимость. Размеры и фото отправлю сообщением.',
  measurement:
    'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу вызвать замерщика. Адрес объекта: ',
  service:
    'Здравствуйте! Пишу с сайта СПФ Регион Строй. Интересует: {название услуги}.',
  case: 'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу похожее решение: {название кейса}.',
};

export interface WaOptions {
  context?: WaContext;
  /** Подставляется вместо {название услуги} / {название кейса}. */
  subject?: string;
}

/**
 * Возвращает ссылку wa.me с готовым текстом.
 * ВАЖНО: строка прогоняется через encodeURIComponent — не собирайте URL вручную.
 */
export function waLink({ context = 'general', subject }: WaOptions = {}): string {
  let text = WA_TEXTS[context];
  if (subject) {
    text = text
      .replace('{название услуги}', subject)
      .replace('{название кейса}', subject);
  }
  // Если subject не передан, плейсхолдеры не должны попасть в сообщение.
  text = text.replace(/\{(название услуги|название кейса)\}/g, '—');
  return `${WA_BASE}?text=${encodeURIComponent(text)}`;
}

export const WA_LINK = waLink({ context: 'general' });
export const WA_LINK_CALC = waLink({ context: 'calculation' });
export const WA_LINK_MEASURE = waLink({ context: 'measurement' });

export function telLink(): string {
  return CONTACTS.phoneHref;
}

export const WA_FALLBACK_LINK_LABEL = 'Нет WhatsApp? Позвонить';
