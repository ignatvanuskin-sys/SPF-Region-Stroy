import Link from 'next/link';
import { BadgeCheck, Clock, MapPin, Star } from 'lucide-react';

import { NOTES } from '@/content/notes';
import { MEDIA } from '@/content/media';
import { TWOGIS } from '@/content/twogis';
import { PhotoSlot } from '@/components/PhotoSlot';
import { MarkerText } from '@/components/MarkerText';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { waLink, telLink } from '@/lib/whatsapp';
import { CONTACTS } from '@/content/contacts';

/**
 * Hero. Паттерн «Trust & Authority + Conversion»:
 * слева — доверие и крупный заголовок, справа — первый шаг воронки
 * (выбор «Окна / Двери / Фасадное остекление»), как в реальном пути клиента из 2ГИС.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Тонкая сетка-фон: линиями, без градиентов и теней */}
      <div
        className="grid-lines pointer-events-none absolute inset-0 opacity-[0.55] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="shell relative grid gap-10 py-10 md:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:gap-16">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Астана · проспект Республики, 56/2а
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Производство · установка · ремонт
            </Badge>
          </div>

          <h1 className="mt-6">
            Окна, двери и фасадные витражи{' '}
            <span className="font-display italic text-primary">в Астане</span>
          </h1>

          <p className="mt-5 max-w-[58ch] text-[17px] text-muted-foreground md:text-[18px]">
            Конструкции из металлопластика и алюминия. Поможем подобрать решение, посчитаем
            стоимость и подготовим заказ после замера.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="wa" size="lg" className="sm:min-w-[230px]">
              <a
                href={waLink({ context: 'general' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать в WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="sm:min-w-[180px]">
              <a href={telLink()}>
                <span className="tnum">{CONTACTS.phone}</span>
              </a>
            </Button>
          </div>

          {/* Строка доверия: данные 2ГИС всегда с датой */}
          <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
            <div>
              <dd className="flex items-baseline gap-1">
                <span className="tnum font-display text-[30px] italic leading-none">
                  {TWOGIS.rating}
                </span>
                <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
              </dd>
              <dt className="mt-1 text-[13px] text-muted-foreground">Рейтинг в 2ГИС</dt>
            </div>
            <div>
              <dd className="tnum text-[30px] font-semibold leading-none">{TWOGIS.reviewsCount}</dd>
              <dt className="mt-1 text-[13px] text-muted-foreground">Отзыва</dt>
            </div>
            <div>
              <dd className="tnum text-[30px] font-semibold leading-none">{TWOGIS.photosCount}</dd>
              <dt className="mt-1 text-[13px] text-muted-foreground">Фото работ</dt>
            </div>
          </dl>
          <p className="mt-2 text-[12px] text-muted-foreground">{TWOGIS.asOfLabel}</p>
        </div>

        <div className="lg:pt-4">
          <div className="rounded-lg border border-border bg-card p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
                1
              </span>
              <h2 className="text-[19px] font-semibold">Что вам нужно?</h2>
            </div>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Выберите одно — откроем заявку с нужной категорией. Дальше можно приложить фото и
              выбрать время замера.
            </p>

            <div className="mt-4">
              <CategoryPicker />
            </div>

            <p className="mt-4 flex items-start gap-2 text-[13px] text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Менеджер связывается с заявкой. Срок ответа:{' '}
                <MarkerText text={NOTES.responseTime} />
              </span>
            </p>
          </div>

          <div className="mt-4 lg:hidden">
            <PhotoSlot
              slot={MEDIA.hero}
              ratio="16:9"
              priority
              sizes="(max-width: 1024px) 100vw, 520px"
            />
          </div>

          <p className="mt-4 text-[13px] text-muted-foreground">
            <Link href="/#uslugi" className="underline underline-offset-2 hover:text-primary">
              Все услуги и цены после замера
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Полоса фактов под hero. Только подтверждённое. */
export function FactsRow() {
  const facts = [
    { title: 'Производство, продажа, установка', note: 'ремонт окон и дверей' },
    { title: 'Металлопластик и алюминий', note: 'окна, двери, витражи' },
    { title: 'Розница и опт', note: 'наличный расчёт и по банку' },
    { title: 'Астана, район Сарыарка', note: 'ориентир — «Астана технопарк»' },
  ];

  return (
    <section className="border-b border-border bg-muted/50 py-8">
      <div className="shell">
        <h2 className="sr-only">Кратко о компании</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <li key={fact.title} className="rounded-lg border border-border bg-background p-4">
              <p className="text-[15px] font-semibold leading-snug">{fact.title}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{fact.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-muted-foreground">
          <MarkerText text={NOTES.parkingAndDelivery} /> {TWOGIS.asOfLabel}
        </p>
      </div>
    </section>
  );
}
