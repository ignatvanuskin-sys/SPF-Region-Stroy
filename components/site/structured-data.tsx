import type { Contacts } from '@/components/site/contact-types';
import type { FaqItem } from '@/content/faq';
import { absoluteUrl } from '@/lib/utils';

/**
 * Разметка schema.org (§14).
 *
 * Важное ограничение: рейтинг 2ГИС НЕ размечается как собственный
 * `aggregateRating`. Это сторонний рейтинг, а не отзывы, собранные на сайте —
 * выдавать его за свои означало бы вводить в заблуждение и поисковик, и людей.
 *
 * График работы попадает в разметку тоже только после подтверждения владельцем.
 */
export function LocalBusinessJsonLd({
  contacts,
  workingHoursText,
  sameAs,
}: {
  contacts: Contacts;
  workingHoursText: string | null;
  sameAs: string[];
}) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': absoluteUrl('/#business'),
    name: contacts.name,
    description:
      'Производство и установка металлопластиковых и алюминиевых окон, входных дверей, фасадных витражей и перегородок в Астане.',
    url: absoluteUrl('/'),
    telephone: contacts.phonePrimary,
    email: contacts.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'проспект Республики, 56/2а',
      addressLocality: 'Астана',
      addressRegion: 'Сарыарка район',
      addressCountry: 'KZ',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 51.183311, longitude: 71.427298 },
    areaServed: { '@type': 'City', name: 'Астана' },
    sameAs,
  };

  if (workingHoursText) {
    data.openingHours = workingHoursText;
  }

  return (
    <script
      type="application/ld+json"
      // JSON.stringify экранирует кавычки; < вырезаем, чтобы исключить </script>
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function FaqJsonLd({ items, url }: { items: FaqItem[]; url: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
    url: absoluteUrl(url),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; href: string }[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
