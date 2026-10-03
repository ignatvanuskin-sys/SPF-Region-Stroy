import Link from 'next/link';

import { MarkerText } from '@/components/MarkerText';
import { WaButton, WaFallback } from '@/components/Cta';
import { PhotoSlot } from '@/components/PhotoSlot';
import type { PhotoSlotDefinition } from '@/content/media';

/**
 * 10.1. Hero страницы услуги: H1, одно предложение, cta_wa + cta_quote.
 * Единственный H1 на странице.
 */
export function PageHero({
  h1,
  lead,
  waContextSubject,
  media,
  showIllustration = true,
}: {
  h1: string;
  lead: string;
  waContextSubject: string;
  media?: PhotoSlotDefinition;
  showIllustration?: boolean;
}) {
  return (
    <section className="border-b border-[color:var(--line)] bg-[color:var(--bg)]">
      <div className="container-page grid gap-8 py-8 md:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h1>{h1}</h1>
          <p className="mt-4 max-w-[64ch] text-[17px] text-[color:var(--ink-2)] md:text-[18px]">
            <MarkerText text={lead} />
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <WaButton
              context="service"
              subject={waContextSubject}
              placement="service_page"
              className="sm:min-w-[240px]"
            />
            <Link href="#zayavka" scroll className="btn btn--primary sm:min-w-[180px]">
              Получить расчёт
            </Link>
          </div>
          <div className="mt-3">
            <WaFallback placement="service_page" />
          </div>
        </div>

        {showIllustration && media && (
          <PhotoSlot slot={media} ratio="16:9" sizes="(max-width: 1024px) 100vw, 520px" />
        )}
      </div>
    </section>
  );
}
