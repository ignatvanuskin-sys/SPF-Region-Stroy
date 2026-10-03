/**
 * content/site.ts — режим сборки и флаги.
 *
 * SITE_MODE=concept    — демо для показа владельцу (по умолчанию):
 *                        баннер сверху, noindex, форма в тестовый чат,
 *                        маркеры видны как жёлтые чипы.
 * SITE_MODE=production — боевой сайт: индексация включена, сборка падает,
 *                        пока остался хотя бы один маркер.
 */

export type SiteMode = 'concept' | 'production';

function readMode(): SiteMode {
  return process.env.SITE_MODE === 'production' ? 'production' : 'concept';
}

export const SITE_MODE: SiteMode = readMode();
export const IS_CONCEPT = SITE_MODE === 'concept';

export const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, '') || 'https://spf-region-stroy.kz';

/** Флаги включаются только явным «true». */
export const KK_ENABLED = process.env.KK_ENABLED === 'true';
export const PORTFOLIO_ENABLED = process.env.PORTFOLIO_ENABLED === 'true';

export const LEAD_TARGET: 'test' | 'prod' =
  process.env.LEAD_TARGET === 'prod' ? 'prod' : 'test';

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
export const YM_ID = process.env.NEXT_PUBLIC_YM_ID || '';

export const COMPANY_NAME = 'СПФ Регион Строй';
export const COMPANY_NAME_FULL = 'ТОО «СПФ Регион Строй»';

export const NAV_ITEMS = [
  { href: '/#uslugi', label: 'Услуги' },
  { href: '/#process', label: 'Как работаем' },
  { href: '/#reviews', label: 'Отзывы 2ГИС' },
  { href: '/#faq', label: 'Вопросы' },
  { href: '/kontakty', label: 'Контакты' },
] as const;

/** Концепт-баннер (только concept). */
export const CONCEPT_BANNER_TEXT =
  'Концепт сайта для СПФ Регион Строй. Не является официальным сайтом компании';
