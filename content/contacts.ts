/**
 * content/contacts.ts — контакты. Значения берутся из реестра фактов (F02–F08).
 * F06 (второй WhatsApp) и F15 (график) намеренно не публикуются.
 */

import { FACTS } from './facts';

export const CONTACTS = {
  legalName: FACTS.F01.value,
  addressShort: 'Астана',
  addressLines: ['проспект Республики, 56/2а', 'Астана, район Сарыарка'],
  addressFull: FACTS.F02.value,
  landmark: 'Ориентир по данным 2ГИС: «Астана технопарк», около 500 м.',
  phone: '+7 701 893 67 87',
  phoneHref: 'tel:+77018936787',
  email: FACTS.F04.value,
  emailHref: `mailto:${FACTS.F04.value}`,
  whatsapp: FACTS.F05.value,
  instagram: FACTS.F07.value,
  instagramHandle: '@spf01002',
  twogisUrl: FACTS.F08.value,
  /**
   * График работы НЕ получен (F15). Мы не копируем закрытые дни из 2ГИС и
   * не выдумываем часы работы — показываем честную подсказку.
   */
  schedule: '[УТОЧНИТЬ У КОМПАНИИ: график работы и выходные]',
  scheduleFallback: 'График работы уточняйте по телефону или в WhatsApp',
} as const;
