import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { SERVICE_PAGES, getServicePage } from '@/content/services';
import { OBJECT_SCENARIOS } from '@/content/objects';
import { faqByIds } from '@/content/faq';
import { NOTES } from '@/content/notes';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { FaqList } from '@/components/Faq';
import { LazyQuiz } from '@/components/LazyBlocks';
import { MarkerText } from '@/components/MarkerText';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { Button } from '@/components/ui/button';
import { ILLUSTRATIONS } from '@/components/illustrations';
import type { IllustrationName } from '@/content/media';

/** Схема для hero страницы услуги. */
const PAGE_ILLUSTRATION: Record<string, IllustrationName> = {
  '/plastikovye-okna': 'WindowDouble',
  '/alyuminievye-okna-i-dveri': 'WindowSingle',
  '/dveri': 'DoorGlass',
  '/fasadnoe-ostekleniye': 'FacadeGrid',
  '/ustanovka-i-remont-okon': 'Partition',
  '/osteklenie-balkona': 'BalconyBlock',
};
import { waLink } from '@/lib/whatsapp';
import { seoFor } from '@/content/seo';

/**
 * Общий шаблон страницы услуги (раздел 10 брифа).
 * Порядок блоков: hero → кому подходит → где применяется → что нужно для
 * расчета → процесс → SEO-текст → FAQ → форма → соседние услуги.
 *
 * Страницы отличаются только контентом из content/services.ts.
 */
export function serviceMetadata(slug: string): Metadata {
  const seo = seoFor(slug);
  return {
    title: seo?.title,
    description: seo?.description,
    alternates: { canonical: slug },
  };
}

export function ServicePageView({ slug }: { slug: string }) {
  const page = getServicePage(slug);
  if (!page) return null;

  const Illustration = ILLUSTRATIONS[PAGE_ILLUSTRATION[slug]] ?? null;
  const faq = faqByIds(page.faqIds);
  const neighbours = SERVICE_PAGES.filter((p) => p.slug !== slug).slice(0, 4);
  const relatedObjects = OBJECT_SCENARIOS.filter((o) =>
    o.serviceIds.some((id) => page.slug.includes(id) || id.includes('pvh')),
  ).slice(0, 2);

  return (
    <>
      <BreadcrumbJsonLd path={slug} name={page.name} />

      {/* 1. Hero страницы */}
      <section className="border-b border-border">
        <div className="shell pt-6">
          <Breadcrumbs items={[{ label: page.name }]} />
        </div>
        <div className="shell grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14">
          <div>
            <p className="eyebrow">{page.query}</p>
            <h1 className="mt-4">{page.h1}</h1>
            <p className="mt-5 max-w-[52ch] text-[17px] text-muted-foreground md:text-[18px]">
              {page.lead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="#raschet" scroll>
                  Получить расчет
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="wa" size="lg">
                <a
                  href={waLink({ context: 'service', subject: page.name })}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics="click_whatsapp"
                  data-placement="hero"
                >
                  Написать в WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {Illustration && (
            <div className="border border-border bg-secondary/50 p-5">
              <Illustration className="h-auto w-full" ratio="3:2" />
              <p className="mt-4 text-[12px] text-muted-foreground">
                Схема. Фотографии по этой услуге появятся после получения от компании.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 2–3. Кому подходит и где применяется */}
      <section className="shell py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <p className="eyebrow">Кому подходит</p>
            <ul className="mt-4 space-y-2.5">
              {page.audience.map((item) => (
                <li key={item} className="flex items-start gap-2.5 border-b border-border pb-2.5 text-[16px]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6">
            <p className="eyebrow">Где применяется</p>
            <ul className="mt-4 space-y-2.5">
              {page.applications.map((item) => (
                <li
                  key={item}
                  className="border-b border-border pb-2.5 text-[16px] text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Что нужно для расчета */}
      <section className="border-y border-border bg-secondary/50">
        <div className="shell py-14 md:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <p className="eyebrow">Для расчета</p>
              <h2 className="mt-4">Что понадобится</h2>
            </div>
            <div className="lg:col-span-8">
              <ul className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
                {page.calcNeeds.map((item) => (
                  <li
                    key={item}
                    className="border-b border-border py-3.5 text-[16px]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="#raschet" scroll>
                    Отправить фото объекта
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#raschet" scroll>
                    Вызвать замерщика
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Как проходит работа */}
      <section className="shell py-14 md:py-20">
        <p className="eyebrow">Процесс</p>
        <h2 className="mt-4 max-w-[40ch]">Как проходит работа</h2>
        <div className="mt-10">
          <ProcessSteps />
        </div>
      </section>

      {/* 6. SEO-текст */}
      <section className="border-t border-border">
        <div className="shell-narrow py-14 md:py-20">
          <h2 className="text-[clamp(20px,2.2vw,26px)]">{page.name} в Астане</h2>
          <p className="mt-4 text-[17px] text-muted-foreground">{page.seoText}</p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            <MarkerText text={NOTES.responseTime} />
          </p>
        </div>
      </section>

      {/* 7. FAQ по услуге */}
      {faq.length > 0 && (
        <section className="shell py-14 md:py-20">
          <p className="eyebrow">Вопросы по услуге</p>
          <h2 className="mt-4">Частые вопросы</h2>
          <div className="mt-8 max-w-[860px]">
            <FaqList items={faq} idPrefix={`faq-${page.slug.replace(/\//g, '')}`} />
          </div>
        </section>
      )}

      {/* 8. Форма */}
      <section className="border-y border-border bg-card" aria-labelledby="form-title">
        <div className="shell py-14 md:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <p className="eyebrow">Расчет</p>
              <h2 className="mt-4" id="form-title">
                Получить расчет
              </h2>
              <p className="mt-4 text-[17px] text-muted-foreground">
                Четыре шага и фото объекта. Предварительный расчет не заменяет замер.
              </p>
              {relatedObjects.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <p className="eyebrow">Подходит для</p>
                  <ul className="mt-3 space-y-2 text-[15px]">
                    {relatedObjects.map((object) => (
                      <li key={object.id}>
                        <Link
                          href="/#obekty"
                          className="text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                        >
                          {object.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="lg:col-span-8">
              <div id="raschet" className="scroll-mt-24">
                <LazyQuiz />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Соседние услуги */}
      <section className="shell py-14 md:py-20">
        <p className="eyebrow">Смотрите также</p>
        <h2 className="mt-4">Другие услуги</h2>
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {neighbours.map((item) => (
            <li key={item.slug}>
              <Link
                href={item.slug}
                className="group flex min-h-[64px] items-center justify-between gap-4 py-4 transition-colors duration-200 hover:text-primary"
              >
                <span>
                  <span className="block font-display text-[17px] font-semibold">{item.name}</span>
                  <span className="mt-1 block max-w-[70ch] text-[15px] text-muted-foreground">
                    {item.lead}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
