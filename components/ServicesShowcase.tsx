import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { SERVICES, type ServiceBlock } from '@/content/services';
import { ILLUSTRATIONS } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { waLink } from '@/lib/whatsapp';

/**
 * Раздел 3 брифа: услуги.
 *
 * Вместо сетки одинаковых карточек — editorial-подача: широкие строки,
 * где визуал и текст чередуются сторонами. У каждой услуги четыре
 * обязательных поля: кому подходит, какую задачу решает, что уточнить, CTA.
 */
export function ServicesShowcase({ items = SERVICES }: { items?: ServiceBlock[] }) {
  return (
    <div>
      {items.map((service, index) => (
        <ServiceRow key={service.id} service={service} index={index} />
      ))}
    </div>
  );
}

function ServiceRow({ service, index }: { service: ServiceBlock; index: number }) {
  const Illustration = ILLUSTRATIONS[service.illustration];
  const flipped = index % 2 === 1;

  return (
    <article
      id={`usluga-${service.id}`}
      className={cn(
        'grid gap-8 border-t border-border py-10 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-12 lg:py-14',
      )}
    >
      {/* Номер услуги — бронзовая деталь */}
      <div className="lg:col-span-1">
        <span className="tnum font-display text-[13px] font-semibold tracking-[0.14em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className={cn('lg:col-span-5', flipped && 'lg:order-3 lg:col-start-8')}>
        <h3 className="font-display text-[clamp(21px,2.6vw,30px)] font-semibold leading-tight">
          {service.href ? (
            <Link href={service.href} className="transition-colors duration-200 hover:text-primary">
              {service.title}
            </Link>
          ) : (
            service.title
          )}
        </h3>
        <p className="mt-3 text-[17px] text-muted-foreground">{service.lead}</p>

        <dl className="mt-7 space-y-5">
          <div>
            <dt className="eyebrow">Кому подходит</dt>
            <dd>
              <ul className="mt-2.5 space-y-1.5 text-[16px]">
                {service.who.map((item) => (
                  <li key={item} className="border-b border-border pb-1.5 last:border-0">
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>

          <div>
            <dt className="eyebrow">Какую задачу решает</dt>
            <dd className="mt-2.5 text-[16px]">{service.task}</dd>
          </div>

          <div>
            <dt className="eyebrow">Что нужно уточнить</dt>
            <dd>
              <ul className="mt-2.5 space-y-1.5 text-[16px] text-muted-foreground">
                {service.clarify.map((item) => (
                  <li key={item} className="border-b border-border pb-1.5 last:border-0">
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a
              href={waLink({ context: 'service', subject: service.title })}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics="click_whatsapp"
              data-placement="section"
            >
              Получить консультацию
            </a>
          </Button>
          {service.href && (
            <Button asChild variant="outline" size="lg">
              <Link href={service.href}>
                Подробнее
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Визуал: либо схема, либо фотография из content/media.ts */}
      <div className={cn('lg:col-span-6', flipped && 'lg:order-2 lg:col-start-2')}>
        <div className="border border-border bg-secondary/50 p-5">
          {Illustration ? (
            <Illustration className="h-auto w-full" ratio="3:2" />
          ) : (
            <div className="aspect-[3/2] w-full bg-muted" />
          )}
          <p className="mt-4 text-[12px] text-muted-foreground">
            Схема. Фотографии по этой услуге появятся после получения от компании.
          </p>
        </div>
      </div>
    </article>
  );
}
