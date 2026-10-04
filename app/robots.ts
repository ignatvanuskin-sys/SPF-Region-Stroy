import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * robots.txt. Закрываем от индексации всё служебное: админку, API, файлы
 * клиентов (там персональные данные и чужие чертежи) и технические страницы.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/status/', '/spasibo'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
