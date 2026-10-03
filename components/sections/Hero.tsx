import Link from 'next/link';

import { NOTES } from '@/content/notes';
import { MEDIA } from '@/content/media';
import { TWOGIS } from '@/content/twogis';
import { PhotoSlot } from '@/components/PhotoSlot';
import { CallButton, PhoneText, WaButton, WaFallback } from '@/components/Cta';
import { MarkerText } from '@/components/MarkerText';

/**
 * 9.1. Hero.
 * Контент обязан помещаться на первый экран вместе с кнопкой WhatsApp
 * и телефоном (раздел 17), поэтому на мобильном визуал идёт после действий.
 */
export function Hero() {
  return (
    <section className="border-b border-[color:var(--line)] bg-[color:var(--bg)]">
      <div className="container-page grid gap-8 py-8 md:gap-10 md:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div>
          <p className="text-[14px] font-medium uppercase tracking-[0.08em] text-[color:var(--muted)]">
            Астана · проспект Республики, 56/2а
          </p>

          <h1 className="mt-4">Окна, двери и фасадные витражи в Астане</h1>

          <p className="mt-4 max-w-[62ch] text-[17px] text-[color:var(--ink-2)] md:text-[18px]">
            Производство, установка и ремонт конструкций из металлопластика и алюминия. Поможем
            подобрать решение, рассчитать стоимость и подготовить заказ после замера.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <WaButton context="general" placement="hero" className="sm:min-w-[240px]" />
            <Link href="#zayavka" scroll className="btn btn--secondary sm:min-w-[180px]">
              Получить расчёт
            </Link>
          </div>

          <div className="mt-3">
            <WaFallback placement="hero" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <PhoneText placement="hero" />
            <CallButton placement="hero" label="Позвонить менеджеру" className="min-h-[44px] py-2" />
          </div>

          <div className="mt-6 border-t border-[color:var(--line)] pt-4">
            <p className="tnum text-[16px] font-semibold">
              {TWOGIS.rating} в 2ГИС · {TWOGIS.reviewsCount} отзыва
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--muted)]">
              {TWOGIS.asOfLabel}.{' '}
              <a
                href={TWOGIS.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Смотреть карточку
              </a>
            </p>
          </div>
        </div>

        {/* На мобильном визуал идёт ПОСЛЕ заголовка и кнопок: H1, кнопка WhatsApp
            и телефон обязаны попадать в первый экран без прокрутки (раздел 17). */}
        <div className="lg:order-none">
          <PhotoSlot
            slot={MEDIA.hero}
            ratio="16:9"
            priority
            sizes="(max-width: 1024px) 100vw, 560px"
          />
        </div>
      </div>
    </section>
  );
}

/** 9.2. Полоса фактов: только подтверждённое. */
export function FactsRow() {
  const facts = [
    { title: 'Производство, установка, ремонт', note: 'по данным 2ГИС' },
    { title: 'Металлопластик и алюминий', note: 'окна, двери, витражи' },
    { title: 'Розница и опт', note: 'по данным 2ГИС' },
    { title: 'Астана', note: 'адрес и карта в контактах' },
  ];

  return (
    <section className="border-b border-[color:var(--line)] bg-[color:var(--bg-alt)] py-8 md:py-10">
      <div className="container-page">
        <h2 className="sr-only">Кратко о компании</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <li key={fact.title} className="card p-4">
              <p className="text-[16px] font-semibold">{fact.title}</p>
              <p className="mt-1 text-[14px] text-[color:var(--muted)]">{fact.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-[color:var(--muted)]">
          <MarkerText text={NOTES.parkingAndDelivery} /> {TWOGIS.asOfLabel}
        </p>
      </div>
    </section>
  );
}
