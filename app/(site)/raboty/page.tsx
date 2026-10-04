import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, CtaBand, GalleryGrid, PageHero } from '@/components/site/sections';
import { EmptyState } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/card';
import { SERVICES } from '@/content/services';
import { getSiteConfig } from '@/lib/domain/settings';
import { toContacts } from '@/lib/site-view';
import { getStore } from '@/lib/db';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Наши работы — окна, витражи и остекление в Астане',
  description:
    'Галерея выполненных работ: окна ПВХ, алюминиевые конструкции, витражи и фасады, входные двери, перегородки, остекление балконов в Астане.',
  alternates: { canonical: '/raboty' },
};

/**
 * Галерея работ (§5, §7).
 *
 * Фильтры сделаны через параметр адреса, а не на JavaScript: страница остаётся
 * серверной, ссылки можно рассылать и индексировать, и на медленном интернете
 * всё работает одинаково.
 *
 * Пока владелец не загрузил ни одного фото, страница честно говорит об этом и
 * не подставляет стоковые снимки чужих окон (§0.7).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const config = await getSiteConfig();
  const contacts = toContacts(config);
  const store = getStore();

  const activeCategory = SERVICES.some((service) => service.slug === category) ? category : undefined;
  const [items, allItems] = await Promise.all([
    store.listGallery({ publishedOnly: true, category: activeCategory }),
    store.listGallery({ publishedOnly: true }),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Портфолио"
        title="Наши работы"
        lead="Объекты, которые мы сделали: от одного окна в квартире до фасадного остекления"
        description="Фильтруйте по типу конструкции, чтобы посмотреть похожие работы."
      >
        <Breadcrumbs items={[{ name: 'Наши работы', href: '/raboty' }]} />
      </PageHero>

      <Section>
        <div className="container-page">
          {allItems.length > 0 ? (
            <>
              <nav aria-label="Фильтр по типу работ" className="mb-8 flex flex-wrap gap-2">
                <Link
                  href="/raboty"
                  aria-current={!activeCategory ? 'true' : undefined}
                  className={cn(
                    'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                    !activeCategory
                      ? 'border-[var(--color-glass)] bg-[var(--color-glass)] text-white'
                      : 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-glass)]',
                  )}
                >
                  Все работы
                </Link>
                {SERVICES.map((service) => {
                  const count = allItems.filter((item) => item.category === service.slug).length;
                  if (count === 0) return null;
                  const active = activeCategory === service.slug;
                  return (
                    <Link
                      key={service.slug}
                      href={`/raboty?category=${service.slug}`}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                        active
                          ? 'border-[var(--color-glass)] bg-[var(--color-glass)] text-white'
                          : 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-glass)]',
                      )}
                    >
                      {service.shortName}
                      <span className="ml-1.5 text-[0.75rem] opacity-70">{count}</span>
                    </Link>
                  );
                })}
              </nav>

              {items.length > 0 ? (
                <GalleryGrid items={items} />
              ) : (
                <EmptyState
                  title="В этой категории пока нет фото"
                  description="Посмотрите другие категории или напишите нам — расскажем про похожие объекты."
                  action={
                    <ButtonLink href="/raboty" variant="outline" size="sm">
                      Все работы
                    </ButtonLink>
                  }
                />
              )}
            </>
          ) : (
            <div className="mx-auto max-w-2xl">
              <EmptyState
                title="Фотографии работ появятся здесь"
                description="Мы не заполняем галерею чужими снимками из интернета: здесь будут только наши объекты. Совсем скоро загрузим их — а пока расскажем о похожих работах по телефону или в WhatsApp."
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <ButtonLink
                      href={`https://wa.me/${contacts.whatsappPrimary}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="cta"
                      size="sm"
                    >
                      Спросить в WhatsApp
                    </ButtonLink>
                    <ButtonLink href={`tel:${contacts.phonePrimary}`} variant="outline" size="sm">
                      Позвонить
                    </ButtonLink>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </Section>

      <CtaBand
        title="Хотите так же?"
        text="Расскажите про свой объект — подберём конструкцию и рассчитаем стоимость."
        contacts={contacts}
        context="raboty_bottom"
      />
    </>
  );
}
