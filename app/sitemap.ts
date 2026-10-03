import type { MetadataRoute } from 'next';

import { SITE_URL, IS_CONCEPT, PORTFOLIO_ENABLED } from '@/content/site';
import { SERVICE_PAGES } from '@/content/services';
import { portfolioVisible } from '@/content/cases';

export const dynamic = 'force-static';

/**
 * В concept sitemap не отдаётся (раздел 2): возвращаем пустой список,
 * robots.txt при этом закрывает сайт целиком.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (IS_CONCEPT) return [];

  const now = new Date();
  const staticRoutes = ['/', '/kontakty', '/privacy'];

  const routes = [
    ...staticRoutes,
    ...SERVICE_PAGES.map((p) => p.slug),
    ...(portfolioVisible(false, PORTFOLIO_ENABLED) ? ['/portfolio'] : []),
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route === '/' ? '' : route}`,
    lastModified: now,
    changeFrequency: route === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: route === '/' ? 1 : 0.7,
  }));
}
