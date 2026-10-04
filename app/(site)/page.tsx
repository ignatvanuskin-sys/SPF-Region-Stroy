import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageCircle, Phone, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { Card, Section } from '@/components/ui/card';
import { QuickLeadForm } from '@/components/forms/quick-lead-form';
import { MapBlock } from '@/components/site/map-block';
import { FaqJsonLd } from '@/components/site/structured-data';
import {
  ContactCards,
  CtaBand,
  FaqList,
  GalleryGrid,
  ProcessSteps,
  RatingBadge,
  ReviewThemes,
  SectionShell,
  ServiceTiles,
  TrustGrid,
} from '@/components/site/sections';
import { FAQ } from '@/content/faq';
import { TRUST_POINTS, PROCESS_STEPS } from '@/content/site';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';
import { getStore } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Окна, двери и фасадные витражи в Астане',
  description:
    'Металлопластиковые и алюминиевые окна, входные двери, фасадные витражи и перегородки в Астане. Собственное производство, доставка, монтаж. Замер на объекте.',
  alternates: { canonical: '/' },
};

/**
 * Главная страница (§6.1). Порядок блоков задан мастер-промптом и подчинён
 * одной задаче: превратить посетителя из 2ГИС или Instagram в заявку.
 *
 * Пустые блоки не заполняются заглушками: пока нет фото работ — блока нет, пока
 * нет подтверждённого текста об условиях замера — показывается нейтральная
 * формулировка из реестра утверждений.
 */
export default async function HomePage() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);
  const store = getStore();

  const [gallery, reviews] = await Promise.all([
    store.listGallery({ publishedOnly: true }),
    store.listReviews({ publishedOnly: true }),
  ]);

  const freeMeasure = claims.free_measure?.effectiveText;
  const publishedReviews = reviews.filter((review) => review.consent_obtained && review.published);
  const homeFaq = FAQ.slice(0, 8);

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="frame-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        {/* Тонкие «створки» на фоне: мотив окна, без единой картинки. */}
        <div
          className="pointer-events-none absolute -right-16 top-0 hidden h-full w-1/3 lg:block"
          aria-hidden="true"
        >
          <svg viewBox="0 0 400 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
            <rect x="60" y="60" width="280" height="480" rx="6" fill="none" stroke="var(--color-glass)" strokeWidth="1.5" opacity="0.35" />
            <line x1="200" y1="60" x2="200" y2="540" stroke="var(--color-glass)" strokeWidth="1.5" opacity="0.35" />
            <line x1="60" y1="300" x2="340" y2="300" stroke="var(--color-glass)" strokeWidth="1.5" opacity="0.35" />
            <path d="M200 60 L340 60 L340 300 Z" fill="var(--color-glass)" opacity="0.07" />
            <path d="M60 300 L200 300 L200 540 Z" fill="var(--color-cta)" opacity="0.08" />
          </svg>
        </div>

        <div className="container-page relative py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            <Badge tone="info" className="mb-5">
              Астана · производство, розница и опт
            </Badge>
            <h1 className="text-[2rem] font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
              Окна, двери и фасадные витражи в Астане — от замера до монтажа
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg">
              Металлопластик и алюминий. Производство, доставка, установка.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <ButtonLink href="/raschet" variant="cta" size="lg">
                Рассчитать стоимость
              </ButtonLink>
              <ButtonLink
                href={`https://wa.me/${contacts.whatsappPrimary}?text=${encodeURIComponent(
                  'Здравствуйте! Пишу с сайта, интересуют окна и витражи.',
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="lg"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Написать в WhatsApp
              </ButtonLink>
            </div>

            {/* Строка доверия: только подтверждённые факты. */}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <RatingBadge contacts={contacts} />
              {freeMeasure ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)]">
                  <ShieldCheck className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
                  {freeMeasure}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- Что мы делаем */}
      <SectionShell
        eyebrow="Услуги"
        title="Что мы делаем"
        description="Шесть направлений — от одного окна в квартире до фасадного остекления коммерческого объекта."
      >
        <ServiceTiles />
      </SectionShell>

      {/* ------------------------------------------------ Как мы работаем */}
      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
              Процесс
            </p>
            <h2 className="text-[1.75rem] font-bold sm:text-4xl">Как мы работаем</h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg">
              Пять шагов без сюрпризов: вы всегда знаете, что происходит с вашим заказом.
            </p>
          </div>
          <div className="mt-8">
            <ProcessSteps />
          </div>
          <p className="mt-5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Сроки изготовления и монтажа зависят от конструкции и загрузки производства — менеджер
            назовёт их при оформлении заказа.
          </p>
        </div>
      </Section>

      {/* ---------------------------------------------- Почему выбирают нас */}
      <SectionShell
        eyebrow="Почему мы"
        title="Почему выбирают нас"
        description="Ниже — только то, что подтверждается карточкой компании и отзывами клиентов."
      >
        <TrustGrid
          items={TRUST_POINTS.filter((point) => point.claimKey === null || claims[point.claimKey]?.confirmed).map(
            (point) => ({ title: point.title, text: point.text }),
          )}
        />
      </SectionShell>

      {/* ------------------------------------------------------ Наши работы */}
      {gallery.length > 0 ? (
        <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
                  Портфолио
                </p>
                <h2 className="text-[1.75rem] font-bold sm:text-4xl">Наши работы</h2>
              </div>
              <Link
                href="/raboty"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-glass)] hover:underline"
              >
                Смотреть все работы
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8">
              <GalleryGrid items={gallery} limit={8} />
            </div>
          </div>
        </Section>
      ) : null}

      {/* --------------------------------------------------------- Отзывы */}
      <SectionShell
        eyebrow="Отзывы"
        title="Что отмечают клиенты"
        description="Это обобщение отзывов из 2ГИС своими словами — не цитаты. Дословные отзывы появятся здесь только с согласия их авторов."
      >
        <RatingBadge contacts={contacts} className="mb-8" />
        <ReviewThemes />

        {publishedReviews.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publishedReviews.map((review) => (
              <figure
                key={review.id}
                className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
              >
                <blockquote className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
                  {review.text}
                </blockquote>
                <figcaption className="mt-3 text-[0.8125rem] font-semibold">
                  {review.author_label}
                  {review.source_url ? (
                    <a
                      href={review.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 font-normal text-[var(--color-glass)] underline underline-offset-2"
                    >
                      источник
                    </a>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-[0.875rem] text-[var(--color-ink-muted)]">
            <a
              href={contacts.gisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--color-glass)] underline underline-offset-2"
            >
              Читать все отзывы в 2ГИС
            </a>{' '}
            — там их {claims.rating_2gis?.confirmed ? `${contacts.rating.ratingsCount} оценок` : 'больше сотни'}.
          </p>
        )}
      </SectionShell>

      {/* ------------------------------------ Быстрая заявка + контакты */}
      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
              Расчёт
            </p>
            <h2 className="text-[1.75rem] font-bold sm:text-4xl">Получить расчёт</h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--color-ink-soft)]">
              Три поля — и менеджер свяжется с вами. Если нужно точно посчитать конструкцию по
              размерам, откройте{' '}
              <Link href="/raschet" className="font-semibold text-[var(--color-glass)] underline underline-offset-2">
                мастер расчёта
              </Link>
              : он спросит параметры и сразу передаст их менеджеру.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <ShieldCheck className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Замер на объекте</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Мастер снимает размеры сам — ошибиться в них нельзя.
                </p>
              </Card>
              <Card className="p-4">
                <Truck className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Доставка</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Привозим конструкции на объект.
                </p>
              </Card>
              <Card className="p-4">
                <Wallet className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Оплата</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Наличными или через банк.
                </p>
              </Card>
            </div>

            <div className="mt-6">
              <ContactCards contacts={contacts} />
            </div>
          </div>

          <Card className="p-6 sm:p-7">
            <QuickLeadForm phonePrimary={contacts.phonePrimary} whatsappPrimary={contacts.whatsappPrimary} />
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------------- FAQ */}
      <SectionShell
        eyebrow="Вопросы"
        title="Частые вопросы"
        description="Отвечаем прямо. Если ответа нет — напишите в WhatsApp, ответим быстро."
      >
        <div className="max-w-3xl">
          <FaqList items={homeFaq} idPrefix="home" />
          <p className="mt-5 text-[0.875rem]">
            <Link href="/faq" className="font-semibold text-[var(--color-glass)] underline underline-offset-2">
              Все вопросы и ответы
            </Link>
          </p>
        </div>
      </SectionShell>

      {/* --------------------------------------------------------- Контакты */}
      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
              Контакты
            </p>
            <h2 className="text-[1.75rem] font-bold sm:text-4xl">Как нас найти</h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)]">
              {claims.working_hours?.confirmed ? claims.working_hours.textRu : 'Режим работы уточняйте у менеджера'}.
              Заявку можно оставить в любое время — свяжемся в рабочее время.
            </p>
            <div className="mt-6 space-y-4">
              <ContactCards contacts={contacts} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <ButtonLink href={`tel:${contacts.phonePrimary}`} variant="primary" size="md">
                  <Phone className="size-4" aria-hidden="true" />
                  Позвонить
                </ButtonLink>
                <ButtonLink
                  href={`https://wa.me/${contacts.whatsappPrimary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="md"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </ButtonLink>
              </div>
            </div>
          </div>
          <MapBlock contacts={contacts} lat={config.lat} lng={config.lng} />
        </div>
      </Section>

      <CtaBand
        title="Не знаете, с чего начать?"
        text="Опишите задачу в двух словах — менеджер подскажет, что подойдёт, и назовёт ориентир по стоимости."
        contacts={contacts}
        context="home_bottom"
      />

      <FaqJsonLd items={homeFaq} url="/" />
    </>
  );
}
