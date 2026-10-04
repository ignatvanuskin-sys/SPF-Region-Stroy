import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/card';
import { Breadcrumbs, CtaBand, PageHero, RatingBadge, ReviewThemes } from '@/components/site/sections';
import { getSiteConfig } from '@/lib/domain/settings';
import { toContacts } from '@/lib/site-view';
import { getStore } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Отзывы клиентов — СПФ Регион Строй, Астана',
  description:
    'Рейтинг компании в 2ГИС и то, что клиенты отмечают в отзывах: соблюдение сроков, аккуратный монтаж, помощь с выбором. Ссылка на все отзывы в 2ГИС.',
  alternates: { canonical: '/otzyvy' },
};

/**
 * Отзывы (§6.6).
 *
 * Три честных правила:
 *  1. Рейтинг 2ГИС показываем как сторонний, со ссылкой и датой проверки — и
 *     не размечаем его как собственный рейтинг сайта.
 *  2. Обобщение отзывов — своими словами. Дословные цитаты появляются только
 *     с согласия их авторов и только по решению владельца в админке.
 *  3. Никаких выдуманных отзывов, звёзд и «счётчиков довольных клиентов».
 *     Один негативный отзыв — тоже часть реальной картины, мы его не прячем.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const contacts = toContacts(config);
  const reviews = await getStore().listReviews({ publishedOnly: true });

  return (
    <>
      <PageHero
        eyebrow="Отзывы"
        title="Отзывы клиентов"
        lead="Мы не пишем отзывы за клиентов и не покупаем оценки"
        description="Ниже — рейтинг компании в 2ГИС и то, что клиенты чаще всего отмечают в своих отзывах."
      >
        <Breadcrumbs items={[{ name: 'Отзывы', href: '/otzyvy' }]} />
      </PageHero>

      <Section>
        <div className="container-page">
          <div className="flex flex-wrap items-center gap-4">
            <RatingBadge contacts={contacts} />
            <ButtonLink
              href={contacts.gisReviews}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Все отзывы в 2ГИС
            </ButtonLink>
          </div>

          <p className="mt-6 max-w-3xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            Рейтинг выше — из карточки компании в 2ГИС, а не собран на этом сайте. Мы показываем его
            со ссылкой на источник и датой проверки: проверить цифры можно в один клик.{' '}
            <span className="text-[var(--color-ink-muted)]">
              Среди отзывов есть и негативный — «дорого, качество хромает». Мы не удаляем такие
              отзывы и не «подкручиваем» рейтинг.
            </span>
          </p>

          <h2 className="mt-12 text-[1.5rem] font-bold tracking-tight sm:text-3xl">
            Что отмечают клиенты
          </h2>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            Это обобщение своими словами, а не цитаты: мы пересказали темы, которые чаще всего
            встречаются в отзывах.
          </p>
          <div className="mt-8">
            <ReviewThemes />
          </div>

          {reviews.length > 0 ? (
            <>
              <h2 className="mt-14 text-[1.5rem] font-bold tracking-tight sm:text-3xl">Отзывы клиентов</h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <figure
                    key={review.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
                  >
                    <blockquote className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
                      {review.text}
                    </blockquote>
                    <figcaption className="mt-3 flex items-center gap-2 text-[0.8125rem] font-semibold">
                      {review.author_label}
                      <a
                        href={review.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-normal text-[var(--color-glass)] underline underline-offset-2"
                      >
                        источник
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                Опубликовано с согласия авторов отзывов.
              </p>
            </>
          ) : (
            <div className="mt-14 max-w-2xl rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] p-6">
              <p className="font-semibold">Дословные отзывы появятся позже</p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-muted)]">
                Мы не копируем отзывы из 2ГИС без разрешения их авторов. Пока читайте все отзывы в
                источнике — ссылка выше.
              </p>
            </div>
          )}
        </div>
      </Section>

      <CtaBand
        title="Остались вопросы?"
        text="Лучший способ проверить компанию — поговорить с ней. Напишите или позвоните."
        contacts={contacts}
        context="otzyvy_bottom"
      />
    </>
  );
}
