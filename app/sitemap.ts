import type { MetadataRoute } from 'next';
import { SERVICES } from '@/content/services';

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Карта сайта. Админка, страница статуса заказа и спасибо-страницы в карту не
 * попадают: они не для поисковика.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/raschet', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/zamer', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/raboty', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/otzyvy', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/o-kompanii', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/dlya-biznesa', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/kontakty', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/politika', priority: 0.2, changeFrequency: 'yearly' },
  ];

  const servicePages = SERVICES.map((service) => ({
    path: `/${service.slug}`,
    priority: 0.8,
    changeFrequency: 'monthly' as const,
  }));

  return [...staticPages, ...servicePages].map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
