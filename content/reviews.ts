/**
 * content/reviews.ts — режим отзывов (раздел 13).
 *
 * 1. link   (по умолчанию): бейдж и ссылка на карточку 2ГИС, текстов отзывов нет.
 * 2. themes: одна нейтральная фраза. Включается ТОЛЬКО после согласия владельца.
 * 3. quotes: короткие цитаты, каждая с ownerApproved + verbatim + ссылкой.
 *
 * Искусственные отзывы, «имена клиентов» и аватары запрещены.
 * Разметку AggregateRating / Review добавлять нельзя — это сторонние отзывы.
 */

export type ReviewsMode = 'link' | 'themes' | 'quotes';

export interface ReviewQuote {
  id: string;
  /** Текст цитаты. Не править и не «улучшать». */
  text: string;
  /** Язык оригинала: kk — показываем на казахском без автоперевода. */
  lang: 'ru' | 'kk';
  ownerApproved: boolean;
  verbatim: boolean;
  sourceUrl: string;
  label: string;
}

export const REVIEWS_MODE: ReviewsMode = 'link';

/** Фраза для режима themes. Утверждается владельцем перед включением. */
export const REVIEW_THEMES_TEXT =
  'В отзывах в 2ГИС клиенты чаще всего упоминают аккуратный монтаж, работу мастеров, консультации и соблюдение оговорённых сроков.';

/** Согласие владельца на публикацию нейтральной фразы. */
export const REVIEW_THEMES_APPROVED = false;

/**
 * Цитаты. По умолчанию пусто: тексты отзывов из 2ГИС не копируются
 * без решения владельца. Имена авторов не используются никогда.
 */
export const REVIEW_QUOTES: ReviewQuote[] = [];

/** Критичный отзыв в карточке существует → формулировки «все клиенты довольны» запрещены. */
export const REVIEWS_NOTE =
  'Отзывы собраны в публичной карточке компании в 2ГИС. Мы не публикуем отзывы на сайте: их можно прочитать по ссылке.';

/**
 * Отключает режим, если владелец ещё не согласовал публикацию.
 * Вынесено в функцию, чтобы TS не сужал тип константы конфигурации.
 */
export function resolveReviewsMode(mode: ReviewsMode): ReviewsMode {
  if (mode === 'themes' && !REVIEW_THEMES_APPROVED) return 'link';
  if (mode === 'quotes') {
    const approved = REVIEW_QUOTES.filter((q) => q.ownerApproved && q.verbatim);
    if (approved.length === 0) return 'link';
  }
  return mode;
}

/** Итоговый режим, который реально используется на сайте. */
export const reviewsModeEnabled: ReviewsMode = resolveReviewsMode(REVIEWS_MODE);
