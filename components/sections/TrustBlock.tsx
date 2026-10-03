import { CONTACTS } from '@/content/contacts';
import { TWOGIS } from '@/content/twogis';
import { REVIEWS_NOTE, REVIEW_THEMES_TEXT, reviewsModeEnabled } from '@/content/reviews';
import { MarkerText } from '@/components/MarkerText';
import { ExternalLink } from '@/components/Cta';

/**
 * 9.9 / 13. Доверие и отзывы 2ГИС.
 *
 * Правила: метрики — только из content/twogis.ts и только с датой;
 * никаких анимированных счётчиков; ссылка вместо копирования отзывов;
 * разметку AggregateRating / Review не добавляем.
 */
export function TrustBlock() {
  const contacts = [
    { label: 'Адрес', value: CONTACTS.addressLines.join(', ') },
    { label: 'Телефон', value: CONTACTS.phone, href: CONTACTS.phoneHref },
    { label: 'Email', value: CONTACTS.email, href: CONTACTS.emailHref },
    { label: 'WhatsApp', value: 'Написать в WhatsApp', href: CONTACTS.whatsapp },
    { label: 'Instagram', value: CONTACTS.instagramHandle, href: CONTACTS.instagram },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="card p-5 md:p-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="tnum text-[32px] font-semibold leading-none">
            {TWOGIS.rating} <span className="text-[16px] font-medium">в 2ГИС</span>
          </p>
          <p className="tnum text-[15px] text-muted-foreground">
            {TWOGIS.ratingsCount} оценок · {TWOGIS.reviewsCount} отзыва
          </p>
        </div>

        <p className="mt-2 text-[13px] text-muted-foreground">{TWOGIS.asOfLabel}</p>

        <p className="mt-4 text-[15px] text-muted-foreground">
          <ExternalLink
            href={TWOGIS.photosUrl}
            placement="contacts"
            event="click_2gis"
            className="underline underline-offset-2"
          >
            {TWOGIS.photosCount} фото в карточке 2ГИС
          </ExternalLink>
        </p>

        {/* Режим отзывов (раздел 13). По умолчанию — только ссылка. */}
        {reviewsModeEnabled === 'themes' && (
          <p className="mt-4 text-[15px] text-muted-foreground">{REVIEW_THEMES_TEXT}</p>
        )}

        <div className="mt-5">
          <ExternalLink
            href={TWOGIS.reviewsUrl}
            placement="contacts"
            event="click_2gis"
            className="btn btn--secondary"
          >
            Читать отзывы в 2ГИС
          </ExternalLink>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground">{REVIEWS_NOTE}</p>
      </div>

      <div className="card p-5 md:p-6">
        <h3 className="text-[18px]">Открытые контакты</h3>
        <dl className="mt-4 space-y-3 text-[15px]">
          {contacts.map((row) => (
            <div key={row.label} className="grid grid-cols-[110px_1fr] gap-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-muted-foreground">
                {row.href ? (
                  <ExternalLink
                    href={row.href}
                    placement="contacts"
                    event={
                      row.label === 'Instagram'
                        ? 'click_instagram'
                        : row.label === 'Email'
                          ? 'click_email'
                          : 'click_2gis'
                    }
                    className="hover:text-primary"
                  >
                    {row.value}
                  </ExternalLink>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-[14px] text-muted-foreground">{CONTACTS.scheduleFallback}</p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          <MarkerText text={CONTACTS.schedule} />
        </p>
      </div>
    </div>
  );
}


