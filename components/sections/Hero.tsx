import Link from 'next/link';
import { ArrowRight, MapPin, MessageCircle, Phone, Star } from 'lucide-react';

import { CONTACTS } from '@/content/contacts';
import { TWOGIS } from '@/content/twogis';
import { NOTES } from '@/content/notes';
import { MarkerText } from '@/components/MarkerText';
import { ArchHero } from '@/components/illustrations/ArchHero';
import { Button } from '@/components/ui/button';
import { waLink, telLink } from '@/lib/whatsapp';

/**
 * Первый экран (раздел 1 брифа).
 *
 * За 5 секунд должно быть понятно: что делает компания, в каком городе,
 * для каких объектов и что сделать дальше. Поэтому: город в надзаголовке,
 * крупный H1, короткое пояснение, один главный CTA и телефон рядом,
 * а метрики 2ГИС — сразу под кнопками, до формы.
 *
 * Композиция асимметричная: узкая текстовая колонка и широкий визуал.
 */
export function Hero() {
  return (
    <section className="relative border-b border-border">
      <div className="shell grid min-w-0 gap-10 pb-12 pt-10 md:gap-12 md:pb-16 md:pt-14 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center lg:gap-14">
        {/* ── Текстовая колонка ───────────────────────────────── */}
        <div className="min-w-0">
          <p className="eyebrow">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Астана · Казахстан
          </p>

          <h1 className="mt-5">
            Окна, двери и фасадные витражи{' '}
            <span className="relative whitespace-nowrap">
              в Астане
              <span
                className="absolute inset-x-0 -bottom-1 h-[3px] bg-accent/60"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-[17px] text-muted-foreground md:text-[19px]">
            Подберем решение под ваш объект, подготовим предварительный расчет и поможем
            организовать замер.
          </p>

          {/* Главный CTA и связь */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="h-auto max-w-full whitespace-normal py-3 text-center leading-snug sm:h-14 sm:whitespace-nowrap sm:py-0">
              <Link href="#raschet" scroll>
                Получить расчет и вызвать замерщика
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="wa" size="lg" className="max-w-full sm:min-w-[210px]">
              <a
                href={waLink({ context: 'calculation' })}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics="click_whatsapp"
                data-placement="hero"
              >
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                Написать в WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="max-w-full sm:min-w-[190px]">
              <a href={telLink()} data-analytics="click_phone" data-placement="hero">
                <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="tnum">{CONTACTS.phone}</span>
              </a>
            </Button>
          </div>

          {/* Доверие до формы: данные 2ГИС с датой сверки */}
          <dl className="mt-9 grid max-w-md grid-cols-3 gap-5 border-t border-border pt-6">
            <div>
              <dd className="flex items-baseline gap-1.5">
                <span className="tnum font-display text-[32px] font-bold leading-none">
                  {TWOGIS.rating}
                </span>
                <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Рейтинг 2ГИС</dt>
            </div>
            <div>
              <dd className="tnum font-display text-[32px] font-bold leading-none">
                {TWOGIS.ratingsCount}
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Оценок</dt>
            </div>
            <div>
              <dd className="tnum font-display text-[32px] font-bold leading-none">
                {TWOGIS.reviewsCount}
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Отзыва</dt>
            </div>
          </dl>
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            {TWOGIS.attribution} Сверено {TWOGIS.asOfHuman}.
          </p>

          <p className="mt-4 text-[14px] text-muted-foreground">
            <MarkerText text={NOTES.responseTime} />
          </p>
        </div>

        {/* ── Визуал ──────────────────────────────────────────── */}
        <div className="lg:pl-4">
          <ArchHero />
        </div>
      </div>
    </section>
  );
}

/**
 * Полоса направлений под первым экраном.
 * Показывает охват услуг до того, как человек начнет выбирать.
 */
export function DirectionStrip() {
  const items = [
    { title: 'Окна ПВХ', note: 'квартиры, дома, помещения' },
    { title: 'Алюминиевые окна', note: 'большие проёмы, коммерция' },
    { title: 'Двери', note: 'балкон, тамбур, входные группы' },
    { title: 'Фасадные витражи', note: 'фасады и перегородки' },
    { title: 'Ремонт окон', note: 'фурнитура, уплотнения, регулировка' },
  ];

  return (
    <section className="border-b border-border bg-secondary/60">
      <div className="shell">
        <h2 className="sr-only">Направления работы</h2>
        <ul className="scroll-x flex gap-0 py-1">
          {items.map((item) => (
            <li
              key={item.title}
              className="min-w-[190px] flex-1 border-r border-border px-5 py-5 last:border-r-0 md:min-w-0"
            >
              <p className="font-display text-[15px] font-semibold leading-snug">{item.title}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{item.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
