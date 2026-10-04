import type { Metadata } from 'next';
import { Building2, FileText, Timer, Users } from 'lucide-react';
import { B2BForm } from '@/components/forms/b2b-form';
import { Breadcrumbs, ClaimNote, PageHero, RatingBadge } from '@/components/site/sections';
import { Card, Section } from '@/components/ui/card';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Окна и витражи для организаций и застройщиков в Астане',
  description:
    'Опт и работа с организациями: окна, входные двери, витражи, перегородки и остекление для магазинов, офисов, СТО и застройщиков. Приложите спецификацию — подготовим расчёт.',
  alternates: { canonical: '/dlya-biznesa' },
};

/**
 * Страница для организаций (§6.4).
 *
 * Заявка уходит в тот же поток, что и частные, но с меткой `segment=b2b` и
 * повышенным приоритетом — такие обращения обычно дороже и требуют ответа
 * быстрее. Условия для организаций (скидки от объёма, отсрочка) не выдумываем:
 * пока владелец не подтвердил, стоит нейтральная формулировка.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);

  const terms = claims.b2b_terms;

  return (
    <>
      <PageHero
        eyebrow="Для организаций"
        title="Работаем с организациями и застройщиками"
        lead="Магазины, офисы, СТО, входные группы и многоквартирные дома"
        description="В карточке компании указаны розница, производство и опт. Отправьте спецификацию или чертёж — подготовим расчёт по вашему объекту."
      >
        <Breadcrumbs items={[{ name: 'Для организаций', href: '/dlya-biznesa' }]} />
      </PageHero>

      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <Card className="p-5 sm:p-7">
            <h2 className="text-xl font-bold tracking-tight">Запрос для организации</h2>
            <p className="mt-1.5 mb-6 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
              Чем подробнее опишете объект, тем точнее будет расчёт. Спецификацию или чертёж можно
              приложить прямо здесь.
            </p>
            <B2BForm phonePrimary={contacts.phonePrimary} whatsappPrimary={contacts.whatsappPrimary} />
          </Card>

          <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <RatingBadge contacts={contacts} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <Timer className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Приоритетная обработка</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Заявки организаций помечаются в CRM как срочные.
                </p>
              </Card>
              <Card className="p-4">
                <FileText className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Работа по спецификации</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  PDF, DWG или DXF — до 15 МБ.
                </p>
              </Card>
              <Card className="p-4">
                <Building2 className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Коммерческие объекты</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Витражи, витрины, входные группы, перегородки.
                </p>
              </Card>
              <Card className="p-4">
                <Users className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
                <p className="mt-2.5 text-[0.875rem] font-semibold">Опт и застройщики</p>
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Объёмы обсуждаются индивидуально.
                </p>
              </Card>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Что приложить к запросу</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>• Планировку или чертёж с размерами проёмов.</li>
                <li>• Количество конструкций и тип заполнения.</li>
                <li>• Сроки, к которым нужен объект.</li>
              </ul>
            </div>

            <ClaimNote>
              {terms?.confirmed && terms.textRu
                ? terms.textRu
                : 'Условия для организаций — скидки от объёма, порядок оплаты — уточнит менеджер при обсуждении заказа.'}
            </ClaimNote>
          </div>
        </div>
      </Section>
    </>
  );
}
