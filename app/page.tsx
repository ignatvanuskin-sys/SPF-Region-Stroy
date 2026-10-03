import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { LazyQuiz, LazyServicesShowcase } from '@/components/LazyBlocks';
import { Hero, DirectionStrip } from '@/components/sections/Hero';
import { ObjectPicker } from '@/components/ObjectPicker';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { TrustBlock } from '@/components/sections/TrustBlock';
import { PortfolioSection } from '@/components/sections/PortfolioSection';
import { ContactsSection } from '@/components/sections/ContactsSection';
import { FaqList } from '@/components/Faq';
import { MarkerText } from '@/components/MarkerText';
import { Button } from '@/components/ui/button';
import { NOTES } from '@/content/notes';
import { SHORT_JOURNEY } from '@/content/process';
import { HOME_FAQ } from '@/content/faq';
import { visibleCases, portfolioVisible } from '@/content/cases';
import { IS_CONCEPT, PORTFOLIO_ENABLED } from '@/content/site';
import { seoFor } from '@/content/seo';
import { waLink } from '@/lib/whatsapp';

const seo = seoFor('/');

export const metadata: Metadata = {
  title: seo?.title,
  description: seo?.description,
  alternates: { canonical: '/' },
};

/** Причины обратиться — только осторожные формулировки из брифа. */
const REASONS = [
  'Окна, двери и витражи в одном месте: не нужно искать трёх подрядчиков',
  'Консультация по выбору решения под ваш объект',
  'Можно отправить фото объекта — сориентируемся до выезда',
  'Предварительный расчет по размерам и фотографиям',
  'Производство, установка и ремонт',
  'Работаем в Астане',
];

/** Заголовок блока: надзаголовок + крупный H2, единый для всей страницы. */
function BlockHeader({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  id?: string;
}) {
  return (
    <header className="max-w-[62ch]" id={id}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4">{title}</h2>
      {lead && <p className="mt-4 text-[17px] text-muted-foreground md:text-[18px]">{lead}</p>}
    </header>
  );
}

export default function HomePage() {
  const showPortfolio = portfolioVisible(IS_CONCEPT, PORTFOLIO_ENABLED);
  const cases = showPortfolio ? visibleCases(IS_CONCEPT) : [];

  return (
    <>
      {/* 1. Первый экран */}
      <Hero />
      <DirectionStrip />

      {/* 2. Выбор по типу объекта */}
      <section className="shell py-16 md:py-24" aria-labelledby="obekty-title">
        <BlockHeader
          id="obekty-title"
          eyebrow="Шаг 1"
          title="Выберите тип объекта"
          lead="От объекта зависит решение: для квартиры и фасада подходят разные конструкции и разный порядок работ."
        />
        <div className="mt-10">
          <ObjectPicker />
        </div>
      </section>

      {/* 3. Услуги */}
      <section className="border-t border-border bg-card" aria-labelledby="uslugi-title">
        <div className="shell py-16 md:py-24">
          <BlockHeader
            id="uslugi-title"
            eyebrow="Шаг 2"
            title="Услуги"
            lead="Шесть направлений. Для каждого — кому подходит, какую задачу решает и что нужно уточнить."
          />
          <div className="mt-12">
            <LazyServicesShowcase />
          </div>
        </div>
      </section>

      {/* 4. Почему обращаются */}
      <section className="shell py-16 md:py-24" aria-labelledby="pochemu-title">
        <BlockHeader
          id="pochemu-title"
          eyebrow="Почему мы"
          title="Почему обращаются в СПФ Регион Строй"
          lead="Только то, что можем подтвердить. Остальное помечено как уточняемое."
        />
        <ul className="mt-10 grid gap-x-12 gap-y-0 md:grid-cols-2">
          {REASONS.map((reason, i) => (
            <li key={reason} className="flex items-start gap-4 border-b border-border py-4">
              <span className="tnum mt-0.5 font-display text-[13px] font-bold tracking-[0.14em] text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[16px]">{reason}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-muted-foreground">
          Не подтверждено компанией: <MarkerText text={NOTES.photoEstimate} />{' '}
          <MarkerText text={NOTES.payment} />
        </p>
      </section>

      {/* 5. Короткий путь до расчета */}
      <section className="border-y border-border bg-secondary/50" aria-labelledby="put-title">
        <div className="shell py-16 md:py-20">
          <BlockHeader
            id="put-title"
            eyebrow="Как это работает"
            title="Пять шагов до предварительного расчета"
            lead="Первый контакт занимает около минуты: выбрать объект, отправить фото, получить подтверждение."
          />
          <ol className="mt-10 grid gap-x-10 gap-y-0 md:grid-cols-2 lg:grid-cols-5">
            {SHORT_JOURNEY.map((step, i) => (
              <li key={step.title} className="border-t border-border pt-5 lg:border-t-2">
                <span
                  className="mb-3 block h-[2px] w-8 bg-accent lg:hidden"
                  aria-hidden="true"
                />
                <p className="tnum font-display text-[13px] font-bold tracking-[0.14em] text-accent">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-[17px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6. Квиз предварительного расчета */}
      <section className="shell py-16 md:py-24" aria-labelledby="raschet-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <BlockHeader
              id="raschet-title"
              eyebrow="Шаг 3"
              title="Получить расчет"
              lead="Четыре коротких шага. Фото можно приложить сразу, время замера — выбрать здесь же."
            />

            <ul className="mt-8 space-y-3">
              {[
                'Ответим и уточним детали',
                'Предложим решение под ваш объект',
                'Согласуем удобное время замера',
                'Подготовим предварительный расчет',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[16px]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-[13px] text-muted-foreground">
                Не хотите заполнять форму?{' '}
                <a
                  href={waLink({ context: 'calculation' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-wa underline underline-offset-2"
                  data-analytics="click_whatsapp"
                  data-placement="section"
                >
                  Напишите в WhatsApp
                </a>{' '}
                или позвоните — этого достаточно для начала.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div id="raschet" className="scroll-mt-24">
              <LazyQuiz />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Как проходит работа */}
      <section className="border-t border-border bg-card" aria-labelledby="process-title">
        <div className="shell py-16 md:py-24">
          <BlockHeader
            id="process-title"
            eyebrow="Процесс"
            title="Как проходит работа"
            lead="Девять этапов от заявки до приемки. Условия, которые компания пока не подтвердила, помечены прямо в тексте."
          />
          <div className="mt-12">
            <ProcessSteps />
          </div>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="#raschet" scroll>
                Получить расчет и вызвать замерщика
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 8. Наши работы */}
      {showPortfolio && (
        <section className="shell py-16 md:py-24" aria-labelledby="portfolio-title">
          <BlockHeader
            id="portfolio-title"
            eyebrow="Портфолио"
            title="Наши работы"
            lead="Тип объекта, задача, решение и результат. Раздел наполняется реальными фотографиями."
          />
          <div className="mt-10">
            <PortfolioSection cases={cases} />
          </div>
        </section>
      )}

      {/* 9. Доверие */}
      <section className="border-y border-border bg-secondary/50" aria-labelledby="doverie-title">
        <div className="shell py-16 md:py-24">
          <BlockHeader
            id="doverie-title"
            eyebrow="Доверие"
            title="Что говорят данные 2ГИС"
            lead="Показываем только то, что можно проверить по открытой карточке компании."
          />
          <div className="mt-10">
            <TrustBlock />
          </div>
        </div>
      </section>

      {/* 10. Частые вопросы */}
      <section className="shell py-16 md:py-24" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <BlockHeader
              id="faq-title"
              eyebrow="Вопросы"
              title="Частые вопросы"
              lead="Ответы, которые чаще всего нужны до заявки. Где данных нет — так и написано."
            />
            <div className="mt-8">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="#raschet" scroll>
                  Задать свой вопрос
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={HOME_FAQ} />
          </div>
        </div>
      </section>

      {/* 11. Контакты */}
      <section className="border-t border-border bg-card" aria-labelledby="kontakty-title">
        <div className="shell py-16 md:py-24">
          <BlockHeader
            id="kontakty-title"
            eyebrow="Контакты"
            title="Связаться с компанией"
            lead="Позвоните, напишите в WhatsApp или оставьте заявку — ответим и подскажем следующий шаг."
          />
          <div className="mt-10">
            <ContactsSection />
          </div>
        </div>
      </section>
    </>
  );
}

