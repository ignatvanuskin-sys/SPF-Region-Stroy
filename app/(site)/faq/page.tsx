import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, CtaBand, FaqList, PageHero } from '@/components/site/sections';
import { FaqJsonLd } from '@/components/site/structured-data';
import { Section } from '@/components/ui/card';
import { FAQ } from '@/content/faq';
import { getSiteConfig } from '@/lib/domain/settings';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Вопросы и ответы об окнах, дверях и витражах в Астане',
  description:
    'Сколько стоит окно, как проходит замер, какая гарантия, чем ПВХ отличается от алюминия, есть ли доставка и как оплатить — ответы на частые вопросы.',
  alternates: { canonical: '/faq' },
};

/**
 * FAQ (§6.7).
 *
 * Каждый ответ — либо подтверждённый факт, либо честное «уточните у менеджера»
 * с кнопкой связи. Разметка FAQPage помогает вопросам попадать в выдачу, но
 * только по тем ответам, которые мы реально можем подтвердить.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const contacts = toContacts(config);

  return (
    <>
      <PageHero
        eyebrow="Вопросы"
        title="Вопросы и ответы"
        lead="Отвечаем прямо, без «уточните в личном кабинете»"
        description="Если ответа на ваш вопрос здесь нет — напишите в WhatsApp, ответим быстро."
      >
        <Breadcrumbs items={[{ name: 'Вопросы и ответы', href: '/faq' }]} />
      </PageHero>

      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <div>
            <FaqList items={FAQ} idPrefix="faq" />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Не нашли ответ?</p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                Напишите в WhatsApp или позвоните — менеджер ответит и подскажет, что подойдёт для
                вашего случая.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href={`https://wa.me/${contacts.whatsappPrimary}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-cta)] px-5 text-sm font-semibold text-[var(--color-cta-ink)] transition-colors hover:bg-[var(--color-cta-hover)]"
                >
                  Написать в WhatsApp
                </Link>
                <Link
                  href={`tel:${contacts.phonePrimary}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-5 text-sm font-semibold transition-colors hover:border-[var(--color-ink)]"
                >
                  {contacts.phonePrimary}
                </Link>
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] p-5">
              <p className="text-[0.875rem] font-semibold">Почему некоторых цифр здесь нет</p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                Мы не публикуем сроки, гарантию и цены, которые не можем подтвердить. Как только
                владелец подтвердит их, ответы на этой странице обновятся автоматически.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      <CtaBand
        title="Готовы посчитать ваш заказ?"
        text="Оставьте заявку — уточним детали и назовём ориентир по стоимости."
        contacts={contacts}
        context="faq_bottom"
      />

      <FaqJsonLd items={FAQ} url="/faq" />
    </>
  );
}
