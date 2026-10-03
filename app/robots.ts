import type { MetadataRoute } from 'next';

import { IS_CONCEPT, SITE_URL } from '@/content/site';

export const dynamic = 'force-static';

/**
 * concept:    Disallow: / — сайт закрыт от индексации целиком.
 * production: индексация включена, sitemap отдаётся.
 */
export default function robots(): MetadataRoute.Robots {
  if (IS_CONCEPT) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
