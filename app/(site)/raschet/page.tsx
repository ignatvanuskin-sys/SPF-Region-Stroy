import type { Metadata } from 'next';
import Link from 'next/link';
import { CalculatorWizard } from '@/components/forms/calculator-wizard';
import { Breadcrumbs, ClaimNote, PageHero, RatingBadge } from '@/components/site/sections';
import { Card, Section } from '@/components/ui/card';
import { getSiteConfig } from '@/lib/domain/settings';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Калькулятор стоимости окон и витражей — расчёт в Астане',
  description:
    'Мастер расчёта: укажите тип конструкции, размеры и район — менеджер подготовит расчёт стоимости окон, дверей, витражей и перегородок в Астане.',
  alternates: { canonical: '/raschet' },
};

/**
 * Мастер предварительного расчёта (§8.2).
 *
 * Задача страницы — собрать параметры конструкции так, чтобы менеджеру не
 * пришлось переспрашивать, и отдать заявку в общий поток. Пока владелец не дал
 * прайс, цена не показывается ни здесь, ни в ответе API.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const contacts = toContacts(config);

  return (
    <>
      <PageHero
        eyebrow="Расчёт"
        title="Рассчитать стоимость"
        lead="Четыре коротких шага — и менеджер увидит все параметры вашей конструкции"
        description="Мастер спросит тип конструкции, размеры, район и контакты. Это быстрее переписки: менеджер получает готовую конфигурацию и не переспрашивает одно и то же."
      >
        <Breadcrumbs items={[{ name: 'Расчёт', href: '/raschet' }]} />
      </PageHero>

      <Section>
        <div className="container-page grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <Card className="p-5 sm:p-7">
            <CalculatorWizard
              phonePrimary={contacts.phonePrimary}
              whatsappPrimary={contacts.whatsappPrimary}
              priceDisplay={config.priceDisplay}
            />
          </Card>

          <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <RatingBadge contacts={contacts} />

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Что происходит после отправки</p>
              <ol className="mt-3 space-y-2.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>1. Заявка сохраняется и мгновенно попадает менеджеру.</li>
                <li>2. Менеджер уточняет детали — обычно по телефону или в WhatsApp.</li>
                <li>3. Дальше можно записаться на замер: мастер приедет и снимет точные размеры.</li>
              </ol>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              <p className="font-bold">Как правильно измерить</p>
              <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
                <li>• Ширина и высота — в миллиметрах, по краям проёма.</li>
                <li>• Наличники и откосы не учитываем — только сам проём.</li>
                <li>• Если есть сомнения, укажите примерно: точные размеры снимет мастер.</li>
              </ul>
            </div>

            <ClaimNote>
              Точную стоимость рассчитает менеджер после замера. Мы сознательно не показываем
              «средние цены»: они почти всегда расходятся с реальной комплектацией.
            </ClaimNote>

            <p className="text-[0.875rem] text-[var(--color-ink-muted)]">
              Нужно только изготовление или нестандартный объект? Напишите на странице{' '}
              <Link href="/dlya-biznesa" className="font-semibold text-[var(--color-glass)] underline underline-offset-2">
                для организаций
              </Link>{' '}
              — там можно приложить спецификацию.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
