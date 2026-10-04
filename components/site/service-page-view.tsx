import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card, Section } from '@/components/ui/card';
import { QuickLeadForm } from '@/components/forms/quick-lead-form';
import { MapBlock } from '@/components/site/map-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/site/structured-data';
import {
  Breadcrumbs,
  ClaimNote,
  CtaBand,
  FaqList,
  GalleryGrid,
  PageHero,
  ProcessSteps,
  RatingBadge,
  SectionShell,
} from '@/components/site/sections';
import type { ServicePage } from '@/content/services';
import type { Contacts } from '@/components/site/contact-types';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';
import { getStore } from '@/lib/db';
import type { GalleryItem } from '@/lib/db/types';

/**
 * Единый шаблон страницы услуги (§5):
 *   H1 → короткое УТП → что входит → варианты → этапы → доверие → фото → FAQ → CTA.
 *
 * Текст для каждой страницы свой (content/services.ts). Этот компонент отвечает
 * только за структуру и за то, чтобы неподтверждённые факты не просочились на
 * страницу: вместо «гарантия 5 лет» клиент увидит нейтральную формулировку.
 */
export async function ServicePageView({ service }: { service: ServicePage }) {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);
  const store = getStore();

  const gallery: GalleryItem[] = await store.listGallery({
    publishedOnly: true,
    category: service.slug,
  });

  const breadcrumbs = [
    { name: 'Услуги', href: '/' },
    { name: service.shortName, href: `/${service.slug}` },
  ];

  // Ответы FAQ: если у вопроса есть ключ утверждения и оно подтверждено —
  // показываем подтверждённый текст, иначе остаётся честная нейтральная версия.
  const faqItems = service.faq.map((item) => {
    const claim = item.claimKey ? claims[item.claimKey] : undefined;
    return {
      q: item.q,
      a: claim?.confirmed && claim.textRu ? claim.textRu : item.a,
    };
  });

  return (
    <>
      <PageHero
        eyebrow={service.shortName}
        title={service.h1}
        lead={service.lead}
        description={service.intro}
      >
        <div className="container-page -mx-5 px-5 sm:-mx-8 sm:px-8">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/zamer"
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-cta)] px-6 font-semibold text-[var(--color-cta-ink)] transition-colors hover:bg-[var(--color-cta-hover)]"
          >
            Записаться на замер
          </Link>
          <Link
            href="/raschet"
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-6 font-semibold transition-colors hover:border-[var(--color-ink)]"
          >
            Рассчитать стоимость
          </Link>
        </div>
      </PageHero>

      {/* Что входит */}
      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div>
            <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Что входит в работу</h2>
            <ul className="mt-6 space-y-3">
              {service.includes.map((item) => (
                <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <Check className="mt-1 size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Card className="h-fit p-6 lg:sticky lg:top-24">
            <QuickLeadForm
              title={`Расчёт: ${service.shortName.toLowerCase()}`}
              description="Оставьте контакты — уточним параметры и подготовим расчёт."
              defaultProductType={service.productType}
              source="service"
              serviceSlug={service.slug}
              phonePrimary={contacts.phonePrimary}
              whatsappPrimary={contacts.whatsappPrimary}
            />
          </Card>
        </div>
      </Section>

      {/* Варианты */}
      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page">
          <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Варианты и типы</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {service.variants.map((variant) => (
              <div
                key={variant.title}
                className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-bg)] p-5"
              >
                <p className="font-bold tracking-tight">{variant.title}</p>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                  {variant.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Из чего складывается стоимость */}
      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">
              Из чего складывается стоимость
            </h2>
            <ul className="mt-6 space-y-3">
              {service.costFactors.map((item) => (
                <li key={item} className="flex gap-3 text-[0.9375rem] leading-relaxed">
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-glass)]"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <ClaimNote>
              Цифры на сайте не публикуем: цена зависит от размеров и комплектации, и «средняя цена»
              здесь только запутает. Точную стоимость рассчитает менеджер после уточнения параметров
              или замера.
            </ClaimNote>
          </div>

          <div className="space-y-4">
            <RatingBadge contacts={contacts} />
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">
                {claims.free_measure?.confirmed
                  ? claims.free_measure.textRu
                  : 'Запишитесь на замер — уточним условия'}
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                Мастер приедет на объект, снимет размеры и поможет выбрать вариант. Вы ничем не
                рискуете: решение принимаете после расчёта.
              </p>
              <Link
                href="/zamer"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-ink)] px-5 text-sm font-semibold text-[var(--color-bg)] transition-colors hover:bg-[var(--color-ink-soft)]"
              >
                Выбрать время замера
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Этапы работы */}
      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page">
          <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Этапы работы</h2>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            Одинаковый порядок для любого заказа — и для одного окна, и для фасадного остекления.
          </p>
          <div className="mt-8">
            <ProcessSteps />
          </div>
        </div>
      </Section>

      {/* Работы по теме — только если владелец загрузил фото */}
      {gallery.length > 0 ? (
        <SectionShell eyebrow="Портфолио" title={`Наши работы: ${service.shortName.toLowerCase()}`}>
          <GalleryGrid items={gallery} limit={8} />
          <p className="mt-5 text-[0.875rem]">
            <Link href="/raboty" className="font-semibold text-[var(--color-glass)] underline underline-offset-2">
              Все работы
            </Link>
          </p>
        </SectionShell>
      ) : null}

      {/* FAQ по теме */}
      <SectionShell
        eyebrow="Вопросы"
        title="Частые вопросы"
        description="По этой услуге чаще всего спрашивают следующее."
      >
        <div className="max-w-3xl">
          <FaqList items={faqItems} idPrefix={service.slug} />
        </div>
      </SectionShell>

      <CtaBand
        title={service.ctaTitle}
        text="Оставьте заявку — уточним параметры, подберём вариант и назовём ориентир по стоимости."
        contacts={contacts}
        context={`service_${service.slug}`}
      />

      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Приехать к нам</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
              Можно приехать в офис, посмотреть образцы профилей и обсудить задачу с менеджером.
            </p>
          </div>
          <MapBlock contacts={contacts} lat={config.lat} lng={config.lng} />
        </div>
      </Section>

      <FaqJsonLd items={faqItems} url={`/${service.slug}`} />
      <BreadcrumbJsonLd items={[{ name: 'Главная', href: '/' }, ...breadcrumbs]} />
    </>
  );
}
