/**
 * content/twogis.ts — ВСЕ значения из карточки 2ГИС лежат здесь и только здесь.
 * Ни одна цифра 2ГИС не должна быть продублирована в текстах страниц.
 * Рейтинг и счётчики подаются только с датой и без анимированных счётчиков.
 */

export const TWOGIS = {
  /** Дата сверки данных. Меняется в одном месте. */
  asOf: '2026-10-03',
  asOfHuman: '03.10.2026',
  asOfLabel: 'по данным карточки 2ГИС на 03.10.2026',
  /** Подпись, которую обязательно сопровождает любое упоминание метрик. */
  attribution: 'Данные публичной карточки компании в 2ГИС на 03.10.2026',

  rating: 4.9,
  ratingsCount: 46,
  reviewsCount: 43,
  photosCount: 26,

  firmUrl: 'https://2gis.kz/astana/firm/70000001042561575',
  reviewsUrl: 'https://2gis.kz/astana/firm/70000001042561575/tab/reviews',
  routeUrl:
    'https://2gis.kz/astana/directions/points/%7C71.427298%2C51.183311%3B70000001042561575',
  /** Ссылка на карточку — на фотографии ведём в саму карточку: отдельный
   *  адрес галереи 2ГИС не подтверждён, придумывать URL запрещено. */
  photosUrl: 'https://2gis.kz/astana/firm/70000001042561575',
} as const;

/** Короткая строка доверия под кнопками Hero. */
export const TRUST_LINE = `${TWOGIS.rating} в 2ГИС · ${TWOGIS.reviewsCount} отзыв${
  TWOGIS.reviewsCount % 10 === 3 ? '' : 'а'
}`;

/** Полная строка с датой. */
export const TRUST_LINE_LONG = `4.9 в 2ГИС · ${TWOGIS.ratingsCount} оценок · ${TWOGIS.reviewsCount} отзыва · ${TWOGIS.asOfLabel}`;

/** Координаты (F02). */
export const COORDS = { lat: 51.183311, lng: 71.427298 } as const;

export const MAP_EMBED_URL = `https://www.google.com/maps?q=${COORDS.lat},${COORDS.lng}&z=17&output=embed`;
