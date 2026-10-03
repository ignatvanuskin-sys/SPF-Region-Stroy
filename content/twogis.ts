/**
 * content/twogis.ts — все значения из публичной карточки 2ГИС.
 *
 * Единственное место, где живут эти цифры. Любое упоминание на сайте обязано
 * идти с датой сверки и подписью «по данным публичной карточки 2ГИС».
 * Анимированные счётчики запрещены: рейтинг не должен «накручиваться».
 */

export const TWOGIS = {
  /** Дата сверки данных. Меняется здесь и только здесь. */
  asOf: '2026-10-03',
  asOfHuman: '03.10.2026',
  asOfLabel: 'по данным публичной карточки 2ГИС на 03.10.2026',
  /** Подпись, обязательная рядом с любым блоком метрик. */
  attribution: 'Рейтинг и отзывы указаны по данным публичной карточки 2ГИС.',

  /** Оценки: рейтинг, количество оценок, отзывов, фотографий. */
  rating: 4.9,
  ratingsCount: 46,
  reviewsCount: 43,
  photosCount: 26,

  /** Ссылки на карточку. Адреса заданы вручную — не собираются из шаблонов. */
  firmUrl: 'https://2gis.kz/astana/firm/70000001042561575',
  reviewsUrl: 'https://2gis.kz/astana/firm/70000001042561575/tab/reviews',
} as const;

/** Координаты из карточки 2ГИС: [долгота, широта]. */
export const COORDS: [number, number] = [71.427298, 51.183311];

/** Встраиваемая карта без API-ключа. */
export const MAP_EMBED_URL = `https://2gis.kz/astana/firm/70000001042561575?m=${COORDS[0]}%2C${COORDS[1]}%2F17`;

/** Готовая ссылка на маршрут. */
export const MAP_ROUTE_URL = `https://2gis.kz/astana/directions/points/%7C${COORDS[0]}%2C${COORDS[1]}%3B70000001042561575`;

/** Краткая строка метрик для hero и trust-блока. */
export const TWOGIS_SHORT = `${TWOGIS.rating} в 2ГИС · ${TWOGIS.ratingsCount} оценок · ${TWOGIS.reviewsCount} отзыва`;
