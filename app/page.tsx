import type { Metadata } from 'next';
import { NOTES } from '@/content/notes';
import Link from 'next/link';

import { LazyLeadForm, LazyPortfolioSection } from '@/components/LazyBlocks';
import { Section } from '@/components/Section';
import { FaqList } from '@/components/Faq';
import { MarkerText } from '@/components/MarkerText';
import { WaButton } from '@/components/Cta';
import { Hero, FactsRow } from '@/components/sections/Hero';
import { ScenarioCards } from '@/components/sections/ScenarioCards';
import { ServicesCatalog } from '@/components/sections/ServicesCatalog';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { WhyUs } from '@/components/sections/WhyUs';
import { TrustBlock } from '@/components/sections/TrustBlock';
import { ContactsSection } from '@/components/sections/ContactsSection';
import { HOME_FAQ } from '@/content/faq';
import { visibleCases, portfolioVisible } from '@/content/cases';
import { PORTFOLIO_ENABLED, IS_CONCEPT } from '@/content/site';
import { seoFor } from '@/content/seo';

const seo = seoFor('/');

export const metadata: Metadata = {
  title: seo?.title ?? undefined,
  description: seo?.description,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const showPortfolio = portfolioVisible(IS_CONCEPT, PORTFOLIO_ENABLED);
  const cases = showPortfolio ? visibleCases(IS_CONCEPT) : [];

  return (
    <>
      {/* 9.1 Hero */}
      <Hero />

      {/* 9.2 Полоса фактов */}
      <FactsRow />

      {/* 9.3 Что вам нужно? */}
      <Section
        id="scenario"
        title="Что вам нужно?"
        lead="Выберите сценарий — мы подставим услугу в заявку и предложим страницу с деталями."
      >
        <ScenarioCards />
        <div className="mt-8 flex flex-wrap gap-3">
          <WaButton context="general" placement="hero" />
          <Link href="#zayavka" scroll className="btn btn--secondary">
            Получить расчёт
          </Link>
        </div>
      </Section>

      {/* 9.4 Каталог услуг */}
      <Section
        id="uslugi"
        alt
        title="Услуги"
        lead="Окна, двери и фасадные витражи из металлопластика и алюминия. Производство, установка и ремонт."
      >
        <ServicesCatalog />
        <div className="mt-8">
          <WaButton context="general" placement="service_page" />
        </div>
      </Section>

      {/* 9.5 Как проходит работа */}
      <Section
        id="process"
        title="Как проходит работа"
        lead="Мы не называем сроки и гарантии на сайте: их подтверждает менеджер при согласовании заказа."
      >
        <ProcessSteps />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="#zayavka" scroll className="btn btn--primary">
            Вызвать замерщика
          </Link>
          <WaButton context="measurement" placement="service_page" />
        </div>
      </Section>

      {/* 9.6 Форма расчёта */}
      <Section
        id="form"
        alt
        title="Расчёт стоимости"
        lead="Заполните короткую заявку. Если знаете размеры — раскройте блок «Добавить размеры и фото»."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div id="zayavka">
            <LazyLeadForm />
          </div>
          <div className="card p-5 md:p-6">
            <h3>Что ускорит расчёт</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-[color:var(--ink-2)]">
              <li>Адрес объекта и тип: квартира, дом или коммерческое помещение.</li>
              <li>Примерное количество окон, дверей или конструкций.</li>
              <li>Размеры проёмов, если их уже измерили.</li>
              <li>Фото проёмов или текущих конструкций.</li>
            </ul>
            <p className="mt-4 text-[14px] text-[color:var(--muted)]">
              <MarkerText text="[ПОДТВЕРДИТЬ: менеджер даёт ориентир по фото и размерам]" />
            </p>
          </div>
        </div>
      </Section>

      {/* 9.7 Почему стоит написать нам */}
      <Section
        id="why"
        title="Почему стоит написать нам"
        lead="Три причины, по которым с нами удобно начать разговор."
      >
        <WhyUs />
        <div className="mt-8">
          <WaButton context="general" placement="hero" />
        </div>
      </Section>

      {/* 9.8 Портфолио */}
      {showPortfolio && (
        <Section
          id="portfolio"
          alt
          title="Портфолио"
          lead={
            IS_CONCEPT ? (
              <>
                Структура карточки кейса. <MarkerText text="[Добавить фото объекта]" /> Реальные
                работы появятся после получения фотографий от компании.
              </>
            ) : (
              'Примеры выполненных работ.'
            )
          }
        >
          <LazyPortfolioSection cases={cases} />
        </Section>
      )}

      {/* 9.9 Доверие и отзывы 2ГИС */}
      <Section
        id="reviews"
        title="Отзывы и репутация"
        lead="Мы показываем данные публичной карточки 2ГИС и ссылку на отзывы — без переноса текстов на сайт."
      >
        <TrustBlock />
      </Section>

      {/* 9.10 FAQ */}
      <Section id="faq" alt title="Частые вопросы">
        <FaqList items={HOME_FAQ} />
        <div className="mt-8 flex flex-wrap gap-3">
          <WaButton context="calculation" placement="service_page" />
          <Link href="#zayavka" scroll className="btn btn--secondary">
            Получить расчёт
          </Link>
        </div>
      </Section>

      {/* 9.11 Контакты */}
      <Section
        id="kontakty-blok"
        title="Контакты"
        lead="Проспект Республики, 56/2а, Астана. Свяжитесь удобным способом."
      >
        <ContactsSection />
      </Section>
    </>
  );
}
