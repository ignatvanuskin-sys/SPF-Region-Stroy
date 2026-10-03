import type { Metadata } from 'next';
import Link from 'next/link';

import { CATALOG, SERVICE_PAGES, getServicePage } from '@/content/services';
import { MEDIA, SERVICE_MEDIA } from '@/content/media';
import { faqByIds } from '@/content/faq';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { FaqList } from '@/components/Faq';
import { LazyLeadForm } from '@/components/LazyBlocks';
import { MarkerText } from '@/components/MarkerText';
import { PageHero } from '@/components/PageHero';
import { Section } from '@/components/Section';
import { ServicesCatalog } from '@/components/sections/ServicesCatalog';
import { ProcessSteps } from '@/components/sections/ProcessSteps';

/**
 * Соответствие страницы услуги категории заявки: форма подставляет её первой.
 */
const CATEGORY_BY_SLUG: Record<string, string> = {
  '/plastikovye-okna': 'windows',
  '/alyuminievye-okna-i-dveri': 'windows',
  '/dveri': 'doors',
  '/fasadnoe-ostekleniye': 'facade',
  '/ustanovka-i-remont-okon': 'repair',
};

import { PhotosButton, WaButton } from '@/components/Cta';

/** Метаданные страницы услуги из content/seo.ts (раздел 19.1). */
export function serviceMetadata(slug: string): Metadata {
  const page = getServicePage(slug);
  const longer = SERVICE_PAGES.find((p) => p.slug === slug);
  return {
    title: longer?.metaTitle,
    description: longer?.metaDescription,
    alternates: { canonical: slug },
  };
}

/** Единый шаблон страницы услуги (раздел 10). */
export function ServicePageView({ slug }: { slug: string }) {
  const page = getServicePage(slug);
  if (!page) return null;

  const faq = faqByIds(page.faqIds);
  const catalog = CATALOG.filter((item) => page.catalogIds.includes(item.id));
  const related = page.related
    .map((r) => SERVICE_PAGES.find((p) => p.slug === r))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <BreadcrumbJsonLd path={page.slug} name={page.name} />
      <Breadcrumbs items={[{ label: page.name }]} />

      {/* 1. Hero страницы */}
      <PageHero
        h1={page.h1}
        lead={page.lead}
        waContextSubject={page.name}
        media={SERVICE_MEDIA[slug] ?? MEDIA.serviceWindow}
      />

      {/* SEO-текст (раздел 10): уникальный, без усиления ключей */}
      <Section title="Об услуге">
        <div className="max-w-[76ch] text-[17px] text-muted-foreground">
          <MarkerText text={page.seoText} />
        </div>
        <div className="mt-6">
          <WaButton context="service" subject={page.name} placement="service_page" />
        </div>
      </Section>

      {/* 2. Кому подходит + 3. Где применяется */}
      <Section alt title="Кому подходит и где применяется">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h3>Кому подходит</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-muted-foreground">
              {page.audience.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
                  <MarkerText text={item} />
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h3>Где применяется</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-muted-foreground">
              {page.applications.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-primary" />
                  <MarkerText text={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 4. Что понадобится для расчёта */}
      <Section title="Что понадобится для расчёта">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
          <ul className="space-y-3 text-[16px] text-muted-foreground">
            {page.calcNeeds.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-[10px] h-[6px] w-[6px] shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="card flex flex-col justify-between p-5">
            <p className="text-[15px] text-muted-foreground">
              Размеры и фото можно просто отправить сообщением — это не заменяет замер, но помогает
              менеджеру сориентироваться.
            </p>
            <div className="mt-4">
              <PhotosButton placement="service_page" />
            </div>
          </div>
        </div>
      </Section>

      {/* 5. Как проходит работа */}
      <Section alt title="Как проходит работа">
        <ProcessSteps />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="#zayavka" scroll className="btn btn--primary">
            Вызвать замерщика
          </Link>
        </div>
      </Section>

      {/* 6. FAQ по теме */}
      <Section title="Вопросы по теме">
        <FaqList items={faq} idPrefix={`faq-${page.slug.replace(/\//g, '')}`} />
      </Section>

      {/* 7. Форма, соседние услуги, контакты */}
      <Section id="form" alt title="Расчёт">
        <div id="zayavka">
          <LazyLeadForm initialCategory={CATEGORY_BY_SLUG[page.slug] ?? 'windows'} />
        </div>
      </Section>

      <Section title="Соседние услуги">
        <ServicesCatalog items={catalog} />
        {related.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={item.slug} className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
