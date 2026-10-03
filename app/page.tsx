import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Camera, ClipboardCheck, MessageCircle } from 'lucide-react';

import { LazyLeadForm } from '@/components/LazyBlocks';
import { Section } from '@/components/Section';
import { FaqList } from '@/components/Faq';
import { MarkerText } from '@/components/MarkerText';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Button } from '@/components/ui/button';
import { Hero, FactsRow } from '@/components/sections/Hero';
import { ServicesCatalog } from '@/components/sections/ServicesCatalog';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { WhyUs } from '@/components/sections/WhyUs';
import { TrustBlock } from '@/components/sections/TrustBlock';
import { ContactsSection } from '@/components/sections/ContactsSection';
import { PortfolioSection } from '@/components/sections/PortfolioSection';
import { HOME_FAQ } from '@/content/faq';
import { visibleCases, portfolioVisible } from '@/content/cases';
import { PORTFOLIO_ENABLED, IS_CONCEPT } from '@/content/site';
import { seoFor } from '@/content/seo';
import { NOTES } from '@/content/notes';

const seo = seoFor('/');

export const metadata: Metadata = {
  title: seo?.title ?? undefined,
  description: seo?.description,
  alternates: { canonical: '/' },
};

/** Три шага, которые видит клиент из 2ГИС. */
const JOURNEY = [
  {
    icon: Camera,
    title: 'Присылаете фото и размеры',
    text: 'Примерных размеров достаточно, чтобы менеджер сориентировался по решению и стоимости.',
  },
  {
    icon: MessageCircle,
    title: 'Сразу получаете подтверждение',
    text: 'Заявке присваивается номер, менеджер видит её в CRM вместе с фотографиями.',
  },
  {
    icon: ClipboardCheck,
    title: 'Дальше — замер и расчёт',
    text: 'Выбираете удобное время замера, после выезда получаете предложение.',
  },
];

export default function HomePage() {
  const showPortfolio = portfolioVisible(IS_CONCEPT, PORTFOLIO_ENABLED);
  const cases = showPortfolio ? visibleCases(IS_CONCEPT) : [];

  return (
    <>
      {/* Hero + первый шаг воронки */}
      <Hero />

      {/* Полоса фактов */}
      <FactsRow />

      {/* Путь клиента: фото → подтверждение → замер */}
      <Section
        id="process-korotko"
        title="Как это работает"
        lead="Короткий путь без звонков и поездок в офис. Начать можно прямо сейчас."
      >
        <ol className="grid gap-4 md:grid-cols-3">
          {JOURNEY.map((step, i) => (
            <li
              key={step.title}
              className="rounded-lg border border-border bg-card p-5 transition-colors duration-200 hover:border-primary"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <step.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">
                  Шаг {i + 1}
                </span>
              </div>
              <h3 className="mt-3">{step.title}</h3>
              <p className="mt-2 text-[15px] text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="#zayavka" scroll>
              Оставить заявку
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Выбор категории */}
      <Section
        id="vybor"
        alt
        title="Что вам нужно?"
        lead="Три направления. Выберите своё — форма подставит категорию сама."
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <CategoryPicker />
          <div className="rounded-lg border border-border bg-background p-5">
            <h3 className="text-[17px]">Что ускорит расчёт</h3>
            <ul className="mt-3 space-y-2 text-[15px] text-muted-foreground">
              <li>Тип объекта: квартира, дом или коммерческое помещение.</li>
              <li>Примерное количество конструкций.</li>
              <li>Размеры проёмов — если уже измеряли.</li>
              <li>Фото проёмов или текущих окон.</li>
            </ul>
            <p className="mt-4 text-[13px] text-muted-foreground">
              <MarkerText text={NOTES.managerPhotoEstimate} />
            </p>
          </div>
        </div>
      </Section>

      {/* Каталог услуг */}
      <Section
        id="uslugi"
        title="Услуги"
        lead="Окна, двери и фасадные витражи из металлопластика и алюминия. Производство, установка и ремонт."
      >
        <ServicesCatalog />
      </Section>

      {/* Процесс работы */}
      <Section
        id="process"
        alt
        title="Как проходит работа"
        lead="Сроки и гарантии не публикуем на сайте: их подтверждает менеджер при согласовании заказа."
      >
        <ProcessSteps />
      </Section>

      {/* Заявка */}
      <Section
        id="form"
        title="Заявка на расчёт или замер"
        lead="Три коротких шага. Фото можно приложить сразу, время замера — выбрать здесь же."
      >
        <div id="zayavka" className="scroll-mt-24">
          <LazyLeadForm />
        </div>
      </Section>

      {/* Почему мы */}
      <Section id="why" alt title="Почему стоит написать нам">
        <WhyUs />
      </Section>

      {/* Портфолио */}
      {showPortfolio && (
        <Section id="portfolio" title="Портфолио">
          <PortfolioSection cases={cases} />
        </Section>
      )}

      {/* Доверие и отзывы */}
      <Section
        id="reviews"
        alt
        title="Отзывы и репутация"
        lead="Показываем данные публичной карточки 2ГИС и ссылку на отзывы — тексты на сайт не переносим."
      >
        <TrustBlock />
      </Section>

      {/* FAQ */}
      <Section id="faq" title="Частые вопросы">
        <FaqList items={HOME_FAQ} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="wa" size="lg">
            <Link href="/#zayavka" scroll>
              Написать в WhatsApp
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#zayavka" scroll>
              Получить расчёт
            </Link>
          </Button>
        </div>
      </Section>

      {/* Контакты */}
      <Section id="kontakty-blok" alt title="Контакты">
        <ContactsSection />
      </Section>
    </>
  );
}
