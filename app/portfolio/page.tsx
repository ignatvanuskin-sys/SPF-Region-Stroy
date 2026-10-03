import type { Metadata } from 'next';
import Link from 'next/link';

import { NOTES } from '@/content/notes';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MarkerText } from '@/components/MarkerText';
import { Section } from '@/components/Section';
import { PortfolioSection } from '@/components/sections/PortfolioSection';
import { WaButton } from '@/components/Cta';
import { IS_CONCEPT, PORTFOLIO_ENABLED } from '@/content/site';
import { portfolioVisible, visibleCases } from '@/content/cases';
import { seoFor } from '@/content/seo';

const seo = seoFor('/portfolio');

export const metadata: Metadata = {
  title: seo?.title,
  description: seo?.description,
  alternates: { canonical: '/portfolio' },
  // Раздел наполняется после получения фото — до этого он не индексируется.
  robots: { index: false, follow: true },
};

export default function PortfolioPage() {
  const visible = portfolioVisible(IS_CONCEPT, PORTFOLIO_ENABLED);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Портфолио' }]} />

      <section className="container-page py-8 md:py-12">
        <h1>Портфолио</h1>
        <p className="mt-4 max-w-[68ch] text-[17px] text-[color:var(--ink-2)]">
          {visible
            ? 'Структура карточки кейса: тип объекта, задача, решение, конструкции, фото, результат.'
            : 'Раздел наполняется после получения фотографий выполненных работ от компании.'}
        </p>
      </section>

      {visible ? (
        <Section title="Примеры работ">
          <div
            role="note"
            className="mb-8 max-w-[76ch] rounded-[10px] border border-[color:var(--line)] bg-[color:var(--marker-bg)] p-4 text-[15px] text-[color:var(--marker-ink)]"
          >
            <MarkerText text={NOTES.addProjectDescription} /> Реальные кейсы и фотографии агент не
            придумывает: карточки ниже показывают структуру и заполняются материалами компании.
          </div>
          <PortfolioSection cases={visibleCases(IS_CONCEPT)} />
        </Section>
      ) : (
        <Section title="Что нужно, чтобы раздел появился">
          <ul className="max-w-[76ch] space-y-2 text-[16px] text-[color:var(--ink-2)]">
            <li>15–30 оригиналов фото готовых работ с разрешением на публикацию.</li>
            <li>Для каждого объекта: тип объекта, что сделано, год.</li>
            <li>По возможности — пары фото «до/после».</li>
          </ul>
          <div className="mt-8">
            <Link href="/kontakty" className="btn btn--secondary">
              Связаться с нами
            </Link>
          </div>
        </Section>
      )}

      <Section alt title="Нужно похожее решение?">
        <p className="max-w-[68ch] text-[16px] text-[color:var(--ink-2)]">
          Опишите задачу и приложите фото — менеджер сориентирует по решению и расчёту.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <WaButton context="calculation" placement="service_page" />
          <Link href="/#zayavka" className="btn btn--primary">
            Получить расчёт
          </Link>
        </div>
      </Section>
    </>
  );
}
