/**
 * content/facts.ts — ЕДИНСТВЕННЫЙ источник фактов о компании (раздел 4 мастер-промпта).
 *
 * Правило: любой факт, которого нет в этом реестре, запрещено утверждать на сайте.
 * Вместо него ставится маркер (см. lib/markers.ts):
 *   [УТОЧНИТЬ У КОМПАНИИ: что именно]  — факта нет в реестре;
 *   [ПОДТВЕРДИТЬ: что именно]          — правдоподобно, но компания не подтвердила.
 *
 * F15 (график работы) НЕ публикуется: полный график в карточке 2ГИС не получен.
 */

export type FactSource = '2GIS' | 'USER' | '2GIS + USER' | 'USER + 2GIS';
export type FactStatus = 'confirmed' | 'to_confirm';

export interface Fact {
  id: string;
  /** Значение факта — то, что можно публиковать. */
  value: string;
  source: FactSource;
  status: FactStatus;
  /** Комментарий для отчёта; на сайте не публикуется. */
  note?: string;
  /** true — факт запрещено выводить на сайте до подтверждения компанией. */
  doNotPublish?: boolean;
}

export const FACTS = {
  F01: {
    id: 'F01',
    value: 'ТОО «СПФ Регион Строй»',
    source: '2GIS',
    status: 'confirmed',
    note: 'В 2ГИС: «ТОО СПФ Регион Строй». Клиенты в отзывах пишут и «SPF».',
  },
  F02: {
    id: 'F02',
    value: 'проспект Республики, 56/2а, Астана, район Сарыарка',
    source: '2GIS',
    status: 'confirmed',
    note: 'Координаты для карты: 51.183311, 71.427298',
  },
  F03: {
    id: 'F03',
    value: '+7 701 893 67 87',
    source: '2GIS + USER',
    status: 'confirmed',
  },
  F04: {
    id: 'F04',
    value: 'plastmontag_2010@mail.ru',
    source: '2GIS + USER',
    status: 'confirmed',
  },
  F05: {
    id: 'F05',
    value: 'https://wa.me/77018936787',
    source: '2GIS + USER',
    status: 'confirmed',
    note: 'Основной WhatsApp.',
  },
  F06: {
    id: 'F06',
    value: 'https://wa.me/77011776090',
    source: '2GIS',
    status: 'to_confirm',
    doNotPublish: true,
    note: 'Второй номер из карточки 2ГИС. Чей номер и показывать ли его — не подтверждено. По умолчанию НЕ показывать.',
  },
  F07: {
    id: 'F07',
    value: 'https://instagram.com/spf01002',
    source: '2GIS + USER',
    status: 'confirmed',
    note: '@spf01002',
  },
  F08: {
    id: 'F08',
    value: 'https://2gis.kz/astana/firm/70000001042561575',
    source: '2GIS',
    status: 'confirmed',
    note: 'Отзывы: …/tab/reviews. Маршрут: …/directions/points/%7C71.427298%2C51.183311%3B70000001042561575',
  },
  F09: {
    id: 'F09',
    value: 'рейтинг 4.9, 46 оценок, 43 отзыва, 26 фото',
    source: '2GIS',
    status: 'confirmed',
    note: 'Публикуется ТОЛЬКО с датой: по данным карточки 2ГИС на 03.10.2026.',
  },
  F10: {
    id: 'F10',
    value: 'Фасадные витражи, окна, двери из металлопластика и алюминия',
    source: '2GIS',
    status: 'confirmed',
    note: 'Слоган карточки 2ГИС.',
  },
  F11: {
    id: 'F11',
    value:
      'Окна — производство, продажа, установка, ремонт. Теги: пластиковые окна, алюминиевые окна со стеклопакетом. Рубрики: Окна, Входные двери, Перегородки',
    source: '2GIS',
    status: 'confirmed',
    note: 'Заголовок карточки в выдаче 2ГИС.',
  },
  F12: {
    id: 'F12',
    value:
      'Тип предприятия: розница, производство, опт. Доставка. Оплата: наличный расчёт, оплата через банк',
    source: '2GIS',
    status: 'confirmed',
    note: 'Условия доставки и предоплаты — ПОДТВ.',
  },
  F13: {
    id: 'F13',
    value:
      'Производство, продажа, установка и ремонт окон; окна из металлопластика и алюминия; металлопластиковые и алюминиевые двери; фасадные витражи и фасадное остекление',
    source: 'USER + 2GIS',
    status: 'confirmed',
    note: 'Подтверждённый список услуг.',
  },
  F14: {
    id: 'F14',
    value: 'Ориентир по данным 2ГИС: «Астана технопарк», около 500 м. Парковочных мест по данным карточки: 6',
    source: '2GIS',
    status: 'to_confirm',
    note: 'Парковку на сайте не утверждать до подтверждения.',
  },
  F15: {
    id: 'F15',
    value: '',
    source: '2GIS',
    status: 'to_confirm',
    doNotPublish: true,
    note: 'График работы не получен. На субботу 03.10.2026 карточка показывала «Закрыто, откроется в понедельник в 09:00». НЕ ПУБЛИКОВАТЬ, не копировать закрытые дни из 2ГИС.',
  },
} as const satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

/** Часть значения факта, пригодная к публикации. Пусто → публиковать нельзя. */
export function factValue(id: FactId): string {
  const fact: Fact = FACTS[id];
  if (fact.doNotPublish) return '';
  return fact.value;
}

export const COMMENT_BIN = '[УТОЧНИТЬ У КОМПАНИИ: БИН и юридические реквизиты]';
