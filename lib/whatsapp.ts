/**
 * lib/whatsapp.ts — сборка ссылок wa.me.
 *
 * Правила:
 *  - в каждом сообщении есть пометка «с сайта», чтобы менеджер видел источник;
 *  - текст короткий и уже содержит то, что нужно менеджеру;
 *  - номер берётся из реестра фактов, а не из строки в компоненте.
 */

import { CONTACTS } from '@/content/contacts';

export type WaContext = 'general' | 'calculation' | 'measurement' | 'service' | 'case';

/** Номер из ссылки F05: https://wa.me/77018936787 */
export const WA_NUMBER = CONTACTS.whatsapp.replace('https://wa.me/', '');

const TEXTS: Record<WaContext, string> = {
  general: 'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу получить консультацию.',
  calculation:
    'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу получить расчет. Тип объекта: ____. Услуга: ____. Фото и размеры отправлю сообщением.',
  measurement:
    'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу вызвать замерщика. Адрес объекта: ____',
  service: 'Здравствуйте! Пишу с сайта СПФ Регион Строй. Интересует услуга: ____.',
  case: 'Здравствуйте! Пишу с сайта СПФ Регион Строй. Хочу похожее решение: ____.',
};

export interface WaLinkParams {
  context: WaContext;
  /** Подставить вместо ____ в тексте — например название услуги. */
  subject?: string;
  /** Тип объекта из квиза. */
  object?: string;
  /** Услуга из квиза. */
  service?: string;
  /** Есть ли уже приложенные файлы. */
  hasFiles?: boolean;
}

/**
 * Ссылка на WhatsApp с предзаполненным сообщением.
 *
 * Для контекста «расчет» сообщение собирается по шаблону из брифа:
 * «Здравствуйте! Хочу получить расчет по остеклению. Тип объекта: ____.
 *  Услуга: ____. Фото/размеры: ____»
 */
export function waLink({
  context,
  subject,
  object,
  service,
  hasFiles = false,
}: WaLinkParams): string {
  let text: string;

  if (context === 'calculation' && (object || service || hasFiles)) {
    text = [
      'Здравствуйте! Хочу получить расчет по остеклению.',
      `Тип объекта: ${object || '____'}.`,
      `Услуга: ${service || '____'}.`,
      `Фото/размеры: ${hasFiles ? 'приложу в чат' : '____'}.`,
    ].join(' ');
  } else if (subject) {
    text = TEXTS[context].replace('____', subject);
  } else {
    text = TEXTS[context];
  }

  return `${CONTACTS.whatsapp}?text=${encodeURIComponent(text)}`;
}

/** Подпись ссылки-дублёра под кнопкой WhatsApp. */
export const WA_FALLBACK_LINK_LABEL = 'Нет WhatsApp? Позвонить';

/** Телефон для ссылки tel: */
export function telLink(): string {
  return CONTACTS.phoneHref;
}

export function mailLink(): string {
  return CONTACTS.emailHref;
}
