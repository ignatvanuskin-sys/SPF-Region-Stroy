import type { Metadata } from 'next';
import { Clock, Mail, MapPin, MessageCircle, Phone, Instagram } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card, Section } from '@/components/ui/card';
import { MapBlock } from '@/components/site/map-block';
import { Breadcrumbs, PageHero, RatingBadge } from '@/components/site/sections';
import { formatTel } from '@/components/site/contact-types';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Контакты — окна и витражи в Астане, пр. Республики 56/2а',
  description:
    'Контакты СПФ Регион Строй: телефон +7 701 893 67 87, WhatsApp, e-mail, Instagram. Адрес: проспект Республики, 56/2а, Сарыарка район, Астана. Как добраться и парковка.',
  alternates: { canonical: '/kontakty' },
};

/**
 * Контакты (§6.5).
 *
 * Все способы связи кликабельны, карта — лёгкая схема с кнопками, а не тяжёлый
 * виджет. Режим работы показываем только если владелец его подтвердил: иначе
 * честное «уточняйте у менеджера».
 */
export default async function Page() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);

  const workingHours = claims.working_hours?.confirmed ? claims.working_hours.textRu : null;
  const waHref = `https://wa.me/${contacts.whatsappPrimary}`;

  return (
    <>
      <PageHero
        eyebrow="Контакты"
        title="Контакты"
        lead="Позвоните, напишите в WhatsApp или приезжайте в офис"
        description="Отвечаем на заявки в рабочее время. Оставить заявку на сайте можно в любое время — она не потеряется."
      >
        <Breadcrumbs items={[{ name: 'Контакты', href: '/kontakty' }]} />
      </PageHero>

      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-4">
            <Card className="p-5">
              <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                <Phone className="size-3.5" aria-hidden="true" />
                Телефон
              </p>
              <a
                href={`tel:${contacts.phonePrimary}`}
                className="mt-2 block text-xl font-bold transition-colors hover:text-[var(--color-glass)]"
              >
                {formatTel(contacts.phonePrimary)}
              </a>
              <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                Звонок и WhatsApp. Второй номер:{' '}
                <a href={`tel:${contacts.phoneSecondary}`} className="underline underline-offset-2">
                  {formatTel(contacts.phoneSecondary)}
                </a>
              </p>
            </Card>

            <Card className="p-5">
              <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                <MapPin className="size-3.5" aria-hidden="true" />
                Адрес
              </p>
              <p className="mt-2 font-bold">{contacts.address}</p>
              <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                Остановка «Астана технопарк» — около 500 м. Парковка: 6 мест.
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Режим работы
                </p>
                <p className="mt-2 text-[0.9375rem] font-medium">
                  {workingHours ?? 'Уточняйте у менеджера'}
                </p>
              </Card>

              <Card className="p-5">
                <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  <Mail className="size-3.5" aria-hidden="true" />
                  E-mail
                </p>
                <a
                  href={`mailto:${contacts.email}`}
                  className="mt-2 block break-anywhere text-[0.9375rem] font-medium transition-colors hover:text-[var(--color-glass)]"
                >
                  {contacts.email}
                </a>
              </Card>
            </div>

            <Card className="p-5">
              <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                <Instagram className="size-3.5" aria-hidden="true" />
                Мы в соцсетях
              </p>
              <a
                href={contacts.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block font-semibold text-[var(--color-glass)] underline underline-offset-2"
              >
                Instagram @spf01002
              </a>
              <a
                href={contacts.gisFirm}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block font-semibold text-[var(--color-glass)] underline underline-offset-2"
              >
                Карточка компании в 2ГИС
              </a>
            </Card>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <ButtonLink href={waHref} target="_blank" rel="noopener noreferrer" variant="cta" size="lg">
                <MessageCircle className="size-4" aria-hidden="true" />
                Написать в WhatsApp
              </ButtonLink>
              <ButtonLink href="/zamer" variant="outline" size="lg">
                Записаться на замер
              </ButtonLink>
            </div>

            <RatingBadge contacts={contacts} />
          </div>

          <div className="space-y-4">
            <MapBlock contacts={contacts} lat={config.lat} lng={config.lng} />
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Как добраться</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>• На автобусе — до остановки «Астана технопарк», около 5 минут пешком.</li>
                <li>• На машине — на территории есть 6 парковочных мест.</li>
                <li>• Координаты для навигатора: {config.lat.toFixed(6)}, {config.lng.toFixed(6)}.</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
