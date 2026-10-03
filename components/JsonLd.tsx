import { CONTACTS } from '@/content/contacts';
import { COORDS, TWOGIS } from '@/content/twogis';
import { SITE_URL } from '@/content/site';

/**
 * JSON-LD LocalBusiness / HomeAndConstructionBusiness (раздел 19.3).
 *
 * Чего здесь СОЗНАТЕЛЬНО нет:
 *  - openingHours — график работы не подтверждён;
 *  - aggregateRating и review — рейтинг 2ГИС отражает сторонние отзывы;
 *  - areaServed — география выезда не подтверждена;
 *  - priceRange — цены не публикуем.
 */
export function LocalBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'HomeAndConstructionBusiness'],
    name: CONTACTS.legalName,
    url: SITE_URL,
    telephone: CONTACTS.phoneHref.replace('tel:', ''),
    email: CONTACTS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'проспект Республики, 56/2а',
      addressLocality: 'Астана',
      addressRegion: 'район Сарыарка',
      addressCountry: 'KZ',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: COORDS[1],
      longitude: COORDS[0],
    },
    sameAs: [TWOGIS.firmUrl],
  };

  return (
    <script
      type="application/ld+json"
      // JSON-LD собирается из констант реестра фактов, пользовательский ввод не попадает.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({ path, name }: { path: string; name: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Разметка FAQPage намеренно не добавляется (раздел 19.3). */
export const FAQPAGE_JSONLD_DISABLED = true;
