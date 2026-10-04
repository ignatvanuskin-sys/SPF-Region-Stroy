import type { Metadata } from 'next';
import { MapPin, PackageCheck, Store, Truck, Wallet } from 'lucide-react';
import { Card, Section } from '@/components/ui/card';
import { MapBlock } from '@/components/site/map-block';
import { Breadcrumbs, ClaimNote, CtaBand, PageHero, RatingBadge, TrustGrid } from '@/components/site/sections';
import { TRUST_POINTS } from '@/content/site';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'О компании — СПФ Регион Строй, Астана',
  description:
    'СПФ Регион Строй: производство, розница и опт. Металлопластиковые и алюминиевые окна, входные двери, витражи и перегородки в Астане, проспект Республики, 56/2а.',
  alternates: { canonical: '/o-kompanii' },
};

/**
 * О компании (§6.3).
 *
 * Здесь только подтверждённые факты: название, адрес, город, типы конструкций,
 * тип предприятия из карточки 2ГИС. Историю, год основания, оборудование и
 * команду не придумываем — они появятся, когда владелец предоставит данные и
 * подтвердит утверждения в админке.
 *
 * Никакой «миссии и ценностей»: вместо пафоса — конкретика.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);

  const facts = [
    { Icon: Store, label: 'Розница и опт', text: 'Работаем и с частными клиентами, и с организациями.' },
    { Icon: PackageCheck, label: 'Производство', text: 'Конструкции изготавливаются по вашим размерам.' },
    { Icon: Truck, label: 'Доставка', text: 'Привозим готовые конструкции на объект.' },
    { Icon: Wallet, label: 'Оплата', text: 'Наличными или через банк.' },
  ];

  return (
    <>
      <PageHero
        eyebrow="О компании"
        title={`${config.name} — окна, двери и витражи в Астане`}
        lead={config.slogan}
        description="Мы производим и устанавливаем металлопластиковые и алюминиевые конструкции: окна, входные двери, фасадные витражи, перегородки и остекление балконов."
      >
        <Breadcrumbs items={[{ name: 'О компании', href: '/o-kompanii' }]} />
      </PageHero>

      <Section>
        <div className="container-page">
          <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Коротко о нас</h2>
          <p className="mt-4 max-w-3xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)] sm:text-base">
            {config.legalName} — компания из Астаны. В карточке 2ГИС у нас указаны три направления
            деятельности: розница, производство и опт. Это значит, что мы делаем конструкции под
            конкретный проём, а не продаём то, что есть на складе, и при этом работаем как с одним
            окном в квартире, так и с фасадом коммерческого объекта.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(({ Icon, label, text }) => (
              <Card key={label} className="p-5">
                <Icon className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-3 font-bold tracking-tight">{label}</p>
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </Section>

      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Рейтинг и отзывы</h2>
            <RatingBadge contacts={contacts} />
          </div>
          <p className="mt-5 max-w-3xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            В отзывах клиенты чаще всего отмечают соблюдение сроков, аккуратный монтаж и то, что
            мастер помогает с выбором. Есть установки 2015 года, о которых пишут, что окна служат до
            сих пор. Что именно отмечают клиенты —{' '}
            <a href="/otzyvy" className="font-semibold text-[var(--color-glass)] underline underline-offset-2">
              на странице отзывов
            </a>
            .
          </p>
        </div>
      </Section>

      <Section>
        <div className="container-page">
          <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Почему нас выбирают</h2>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            Ниже — только подтверждённые факты и темы из отзывов клиентов.
          </p>
          <div className="mt-8">
            <TrustGrid
              items={TRUST_POINTS.filter(
                (point) => point.claimKey === null || claims[point.claimKey]?.confirmed,
              ).map((point) => ({ title: point.title, text: point.text }))}
            />
          </div>
          <ClaimNote>
            Год основания, оборудование производства, площадь цеха и состав команды здесь
            появятся после того, как владелец их подтвердит. Придумывать эти цифры мы не будем.
          </ClaimNote>
        </div>
      </Section>

      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="container-page grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="text-[1.5rem] font-bold tracking-tight sm:text-3xl">Где мы находимся</h2>
            <p className="mt-3 flex items-start gap-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
              {contacts.address}
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
              Можно приехать, посмотреть образцы профилей и стеклопакетов, обсудить задачу с
              менеджером. Режим работы уточняйте по телефону.
            </p>
          </div>
          <MapBlock contacts={contacts} lat={config.lat} lng={config.lng} />
        </div>
      </Section>

      <CtaBand
        title="Расскажите о своей задаче"
        text="Подберём конструкцию, приедем на замер и подготовим расчёт."
        contacts={contacts}
        context="about_bottom"
      />
    </>
  );
}
