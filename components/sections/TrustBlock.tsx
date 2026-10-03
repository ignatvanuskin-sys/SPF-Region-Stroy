'use client';

import Link from 'next/link';
import { ExternalLink, FileText, ShieldCheck, Star } from 'lucide-react';

import { CONTACTS } from '@/content/contacts';
import { TWOGIS } from '@/content/twogis';
import { NOTES } from '@/content/notes';
import { REVIEWS_NOTE, REVIEW_THEMES_TEXT, reviewsModeEnabled } from '@/content/reviews';
import { MarkerText } from '@/components/MarkerText';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';

/**
 * Раздел 8 брифа: доверие.
 *
 * Метрики 2ГИС подаются одним блоком, всегда с датой сверки и подписью
 * об источнике — и без анимированных счётчиков. Отзывы не копируются
 * и не выдумываются: только ссылка на публичную карточку.
 * Договор, гарантия и сертификаты показаны как поля под подтверждение.
 */
export function TrustBlock() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Метрики 2ГИС */}
      <div className="lg:col-span-5">
        <div className="border border-border bg-card p-6">
          <div className="flex items-baseline gap-3">
            <span className="tnum font-display text-[52px] font-bold leading-none">
              {TWOGIS.rating}
            </span>
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={
                    i < Math.round(TWOGIS.rating)
                      ? 'h-4 w-4 fill-accent text-accent'
                      : 'h-4 w-4 text-border'
                  }
                />
              ))}
            </span>
          </div>

          <p className="mt-3 text-[15px] text-muted-foreground">
            Рейтинг в 2ГИС по {TWOGIS.ratingsCount} оценкам и {TWOGIS.reviewsCount} отзывам.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div>
              <dd className="tnum font-display text-[26px] font-semibold leading-none">
                {TWOGIS.ratingsCount}
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Оценок</dt>
            </div>
            <div>
              <dd className="tnum font-display text-[26px] font-semibold leading-none">
                {TWOGIS.reviewsCount}
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Отзыва</dt>
            </div>
            <div>
              <dd className="tnum font-display text-[26px] font-semibold leading-none">
                {TWOGIS.photosCount}
              </dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Фотографий</dt>
            </div>
            <div>
              <dd className="font-display text-[26px] font-semibold leading-none">Астана</dd>
              <dt className="mt-1.5 text-[13px] text-muted-foreground">Город работы</dt>
            </div>
          </dl>

          <div className="mt-6">
            <Button asChild variant="outline" className="w-full">
              <a
                href={TWOGIS.firmUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('click_2gis', { placement: 'section' })}
              >
                Открыть карточку в 2ГИС
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          <p className="mt-4 text-[12px] text-muted-foreground">
            {TWOGIS.attribution} Сверено {TWOGIS.asOfHuman}.
          </p>
        </div>

        {reviewsModeEnabled === 'themes' && (
          <p className="mt-4 text-[15px] text-muted-foreground">{REVIEW_THEMES_TEXT}</p>
        )}
        <p className="mt-4 text-[13px] text-muted-foreground">{REVIEWS_NOTE}</p>
      </div>

      {/* Фотографии работ */}
      <div className="lg:col-span-7">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center border border-dashed border-input bg-muted/50 p-3 text-center"
            >
              <span className="font-mono text-[11px] leading-snug text-muted-foreground">
                {i === 5 ? NOTES.casePhotoBeforeAfter : NOTES.casePhotoInstall}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          Место под реальные фотографии работ. Чужие снимки из интернета не используем.
        </p>

        {/* Документы и условия — под подтверждение */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <DocumentCard
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            title="Договор"
            note={<MarkerText text={NOTES.contract} />}
          />
          <DocumentCard
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            title="Гарантия"
            note={<MarkerText text={NOTES.warranty} />}
          />
          <DocumentCard
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            title="Сертификаты"
            note={<MarkerText text={NOTES.certificates} />}
          />
        </div>

        <p className="mt-6 text-[15px] text-muted-foreground">
          Контакты открыты:{' '}
          <Link href="/kontakty" className="text-primary underline underline-offset-2">
            адрес, телефон и WhatsApp
          </Link>
          . Адрес: {CONTACTS.addressFull}.
        </p>
      </div>
    </div>
  );
}

function DocumentCard({
  icon,
  title,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  note: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-display text-[15px] font-semibold">
        <span className="text-accent">{icon}</span>
        {title}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{note}</p>
    </div>
  );
}
