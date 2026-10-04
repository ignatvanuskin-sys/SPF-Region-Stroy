import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  ChevronRight,
  DoorOpen,
  Frame,
  Grid2x2,
  LayoutPanelTop,
  MessageCircle,
  PanelsTopLeft,
  Phone,
  Star,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { Card, Section, SectionHeading } from '@/components/ui/card';
import { PROCESS_STEPS, REVIEW_THEMES } from '@/content/site';
import { SERVICES } from '@/content/services';
import type { FaqItem } from '@/content/faq';
import type { Contacts } from '@/components/site/contact-types';
import { formatTel } from '@/components/site/contact-types';
import type { GalleryItem } from '@/lib/db/types';
import { formatDateLong } from '@/lib/utils';

/**
 * Набор блоков, из которых собираются страницы. Все они принимают только
 * подтверждённые данные: если данных нет, блок скрывается, а не заполняется
 * заглушками и стоковыми фото (§7).
 */

const SERVICE_ICONS = {
  'okna-pvh': Frame,
  'aluminievye-okna': Grid2x2,
  'vitrazhi-fasady': Building2,
  'vhodnye-dveri': DoorOpen,
  peregorodki: LayoutPanelTop,
  balkony: PanelsTopLeft,
} as const;

// ---------------------------------------------------------------- хлебные крошки

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <li>
          <Link href="/" className="transition-colors hover:text-[var(--color-glass)]">
            Главная
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            {index === items.length - 1 ? (
              <span aria-current="page" className="text-[var(--color-ink-soft)]">
                {item.name}
              </span>
            ) : (
              <Link href={item.href} className="transition-colors hover:text-[var(--color-glass)]">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ------------------------------------------------------------------- шапка страницы

export function PageHero({
  eyebrow,
  title,
  lead,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      {/* Мотив «оконная рама»: тонкая сетка на фоне, без тяжёлых картинок. */}
      <div className="frame-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-page relative py-10 sm:py-14">
        {eyebrow ? (
          <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-3xl text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:text-[2.5rem]">
          {title}
        </h1>
        {lead ? (
          <p className="mt-3 max-w-2xl text-base font-medium text-[var(--color-glass-deep)] sm:text-lg">{lead}</p>
        ) : null}
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)]">{description}</p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </header>
  );
}

// --------------------------------------------------------------- рейтинг 2ГИС

/**
 * Рейтинг 2ГИС. Показываем честно: с указанием источника и даты проверки, и
 * никогда — как собственный рейтинг сайта.
 */
export function RatingBadge({ contacts, className }: { contacts: Contacts; className?: string }) {
  return (
    <div className={className}>
      <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5">
        <span className="flex items-center gap-1.5">
          <Star className="size-4 fill-[var(--color-cta)] text-[var(--color-cta)]" aria-hidden="true" />
          <span className="font-bold">{contacts.rating.value.toFixed(1)}</span>
        </span>
        <span className="text-[0.8125rem] text-[var(--color-ink-soft)]">
          {contacts.rating.ratingsCount} оценок в 2ГИС
        </span>
        <span className="text-[0.75rem] text-[var(--color-ink-muted)]">
          по данным карточки на {formatDateLong(contacts.rating.checkedAt)}
        </span>
        <a
          href={contacts.gisReviews}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.8125rem] font-semibold text-[var(--color-glass)] underline underline-offset-2"
        >
          Читать отзывы
        </a>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- плитки услуг

export function ServiceTiles({ excludeSlug }: { excludeSlug?: string }) {
  const visible = SERVICES.filter((service) => service.slug !== excludeSlug);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((service) => {
        const Icon = SERVICE_ICONS[service.slug as keyof typeof SERVICE_ICONS] ?? Frame;
        return (
          <Link
            key={service.slug}
            href={`/${service.slug}`}
            className="group flex min-h-28 flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-glass)]"
          >
            <Icon className="size-6 text-[var(--color-glass)]" aria-hidden="true" />
            <div className="mt-4">
              <p className="font-bold tracking-tight">{service.shortName}</p>
              <p className="mt-1 text-[0.8125rem] leading-snug text-[var(--color-ink-muted)]">{service.lead}</p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[var(--color-glass)]">
                Подробнее
                <ArrowRight
                  className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------- шаги работы

export function ProcessSteps() {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PROCESS_STEPS.map((item) => (
        <li
          key={item.step}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <span className="text-[0.8125rem] font-bold tracking-widest text-[var(--color-glass)]">{item.step}</span>
          <p className="mt-2 font-bold tracking-tight">{item.title}</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">{item.text}</p>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ блоки доверия

export function TrustGrid({ items }: { items: { title: string; text: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <p className="font-bold tracking-tight">{item.title}</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- что отмечают

export function ReviewThemes() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {REVIEW_THEMES.map((theme) => (
        <div
          key={theme.title}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
        >
          <p className="font-bold tracking-tight">{theme.title}</p>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">{theme.text}</p>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------- FAQ

/**
 * FAQ на нативных <details>: работает без JavaScript, доступно с клавиатуры и
 * не добавляет ни строчки в бандл. Первый вопрос раскрыт — страница не
 * выглядит пустой.
 */
export function FaqList({ items, idPrefix }: { items: FaqItem[]; idPrefix: string }) {
  return (
    <div className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      {items.map((item, index) => (
        <details key={`${idPrefix}-${index}`} open={index === 0} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 font-semibold transition-colors hover:bg-[var(--color-surface-alt)]">
            <span>{item.q}</span>
            <ChevronRight
              className="mt-1 size-4 shrink-0 text-[var(--color-glass)] transition-transform duration-200 group-open:rotate-90"
              aria-hidden="true"
            />
          </summary>
          <div className="px-5 pb-5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------- галерея

/**
 * Галерея работ. Пока владелец не загрузил фото, блок не показывается вовсе —
 * стоковые снимки чужих окон здесь недопустимы (§0.7).
 */
export function GalleryGrid({ items, limit }: { items: GalleryItem[]; limit?: number }) {
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {visible.map((item) => (
        <figure
          key={item.id}
          className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/files/${item.storage_key}`}
            alt={item.title}
            width={item.width ?? 1200}
            height={item.height ?? 900}
            loading="lazy"
            decoding="async"
            className="aspect-4/3 w-full object-cover"
          />
          <figcaption className="p-3 text-[0.8125rem] font-medium">{item.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------- контакты

export function ContactCards({ contacts }: { contacts: Contacts }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="p-5">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Телефон
        </p>
        <a
          href={`tel:${contacts.phonePrimary}`}
          className="mt-2 block text-lg font-bold transition-colors hover:text-[var(--color-glass)]"
        >
          {formatTel(contacts.phonePrimary)}
        </a>
        <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">Звонок и WhatsApp</p>
      </Card>
      <Card className="p-5">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Адрес
        </p>
        <p className="mt-2 font-bold">{contacts.address}</p>
        <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
          Остановка «Астана технопарк» — 500 м, 6 парковочных мест
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- CTA-полоса

/** Тёмная секция — акцент, а не отдельная тема оформления (§7). */
export function CtaBand({
  title,
  text,
  contacts,
  primaryHref = '/raschet',
  primaryLabel = 'Рассчитать стоимость',
  context,
}: {
  title: string;
  text: string;
  contacts: Contacts;
  primaryHref?: string;
  primaryLabel?: string;
  context: string;
}) {
  const waHref = `https://wa.me/${contacts.whatsappPrimary}?text=${encodeURIComponent(
    'Здравствуйте! Пишу с сайта, интересуют окна и витражи.',
  )}`;

  return (
    <section className="bg-[var(--color-dark)] py-14 text-[var(--color-on-dark)] sm:py-16">
      <div className="container-page flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">{title}</h2>
          <p className="mt-2.5 leading-relaxed text-[var(--color-on-dark-muted)]">{text}</p>
        </div>
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
          <ButtonLink href={primaryHref} variant="cta" size="lg" data-context={context}>
            <CalendarCheck className="size-4" aria-hidden="true" />
            {primaryLabel}
          </ButtonLink>
          <ButtonLink
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            className="border border-[var(--color-dark-line)] bg-transparent text-[var(--color-on-dark)] hover:bg-[var(--color-dark-soft)]"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- заметка

/** Нейтральная пометка там, где факт ещё не подтверждён владельцем (§3). */
export function ClaimNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] p-3.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
      {children}
    </p>
  );
}

export function SectionShell({
  eyebrow,
  title,
  description,
  children,
  align = 'left',
  className,
  width = 'default',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  width?: 'default' | 'wide';
}) {
  return (
    <Section className={className}>
      <div className={width === 'wide' ? '' : 'container-page'}>
        <SectionHeading eyebrow={eyebrow} title={title} description={description} align={align} />
        <div className="mt-8">{children}</div>
      </div>
    </Section>
  );
}

export { Badge, Phone };
