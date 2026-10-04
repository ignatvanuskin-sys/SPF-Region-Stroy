import type { Metadata } from 'next';
import { MeasureForm } from '@/components/forms/measure-form';
import { MapBlock } from '@/components/site/map-block';
import { Breadcrumbs, ClaimNote, PageHero, RatingBadge } from '@/components/site/sections';
import { Card, Section } from '@/components/ui/card';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Запись на замер окон и витражей в Астане',
  description:
    'Выберите удобное время — мастер приедет на объект, снимет размеры и поможет выбрать конструкцию. Замер окон, дверей, витражей и остекления балкона в Астане.',
  alternates: { canonical: '/zamer' },
};

/**
 * Запись на замер (§8.3).
 *
 * Без SMS-подтверждения это запрос: клиент выбирает слот, менеджер подтверждает
 * его кнопкой в Telegram. Текст на странице говорит именно так — «подтвердим»,
 * а не «вы записаны», чтобы не обещать того, чего система не делает.
 *
 * Условия замера (бесплатно или платно) берутся из реестра утверждений: пока
 * владелец не подтвердил, показываем нейтральную формулировку.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);

  const freeMeasureText = claims.free_measure?.confirmed
    ? claims.free_measure.textRu
    : 'Запишитесь на замер — уточним условия';

  return (
    <>
      <PageHero
        eyebrow="Замер"
        title="Запись на замер"
        lead="Выберите удобное время — мы подтвердим его и приедем на объект"
        description="Мастер снимет точные размеры проёма, оценит состояние стены и поможет выбрать конструкцию. Без этого этапа правильный расчёт невозможен."
      >
        <Breadcrumbs items={[{ name: 'Замер', href: '/zamer' }]} />
      </PageHero>

      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <Card className="p-5 sm:p-7">
            <MeasureForm
              phonePrimary={contacts.phonePrimary}
              whatsappPrimary={contacts.whatsappPrimary}
              freeMeasureText={freeMeasureText}
            />
          </Card>

          <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <RatingBadge contacts={contacts} />

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Как проходит замер</p>
              <ol className="mt-3 space-y-2.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>1. Мастер приезжает в выбранное время и снимает размеры проёма.</li>
                <li>2. Показывает образцы профилей и помогает выбрать вариант.</li>
                <li>3. Вы получаете расчёт и уже спокойно решаете, заказывать или нет.</li>
              </ol>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">К замеру полезно подготовить</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>• Свободный доступ к окну или балкону.</li>
                <li>• Эскиз или фото, если есть пожелания по конструкции.</li>
                <li>• Понимание, где хотите видеть открывающиеся створки.</li>
              </ul>
            </div>

            <ClaimNote>
              Условия выезда — бесплатный замер или оплачиваемый — уточнит менеджер при
              подтверждении записи. Мы не пишем «бесплатно» до того, как владелец подтвердит это.
            </ClaimNote>

            <MapBlock contacts={contacts} lat={config.lat} lng={config.lng} />
          </div>
        </div>
      </Section>
    </>
  );
}
