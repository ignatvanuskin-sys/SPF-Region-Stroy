import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { SOURCE_LINKS, SOURCE_LABELS } from '@/lib/domain/attribution';
import { getSiteConfig } from '@/lib/domain/settings';
import { absoluteUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Ссылки с метками источника и QR-коды (§8.6).
 *
 * Смысл страницы простой: чтобы владелец мог расставить ссылки в карточке
 * 2ГИС, шапке Instagram и WhatsApp-визитке и точно знал, откуда пришёл клиент.
 * Без метки `?src=` все заявки склеятся в «прямой заход», и реклама перестанет
 * быть управляемой.
 *
 * QR-коды генерируются на сервере и отдаются картинкой — их можно скачать,
 * распечатать и повесить на визитку, бланк замера или табличку в цехе.
 */
export default async function LinksPage() {
  const config = await getSiteConfig();
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ссылки и QR-коды</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Разместите эти ссылки на сторонних площадках — в заявке будет видно, откуда пришёл клиент.
        </p>
      </div>

      {base.includes('localhost') ? (
        <Alert tone="warning">
          Сейчас в SITE_URL указан localhost. До публикации сайта замените SITE_URL на реальный домен —
          иначе ссылки и QR-коды будут вести на локальную машину.
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {SOURCE_LINKS.map((item) => {
          const url = absoluteUrl(`/?src=${item.src}`, base);
          return (
            <Card key={item.src} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold">{item.label}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">{item.hint}</p>
                  <code className="mt-3 block break-anywhere rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2.5 text-[0.75rem]">
                    {url}
                  </code>
                  <p className="mt-2 text-[0.75rem] text-[var(--color-ink-muted)]">
                    В админке источник будет показан как «{SOURCE_LABELS[item.src] ?? item.src}».
                  </p>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/qr?data=${encodeURIComponent(url)}&size=180`}
                  alt={`QR-код для ссылки ${item.label}`}
                  width={180}
                  height={180}
                  className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-white p-1.5"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[0.8125rem] font-semibold">
                <a
                  href={`/api/admin/qr?data=${encodeURIComponent(url)}&size=600&format=png`}
                  download={`qr-${item.src}.png`}
                  className="text-[var(--color-glass)] underline underline-offset-2"
                >
                  Скачать PNG
                </a>
                <a
                  href={`/api/admin/qr?data=${encodeURIComponent(url)}&size=600&format=svg`}
                  download={`qr-${item.src}.svg`}
                  className="text-[var(--color-glass)] underline underline-offset-2"
                >
                  Скачать SVG
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <p className="font-bold">Уже размещённые ссылки</p>
        <ul className="mt-3 space-y-2 text-[0.875rem]">
          <li>
            Карточка 2ГИС:{' '}
            <a
              href={config.gisFirm}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-glass)] underline underline-offset-2 break-anywhere"
            >
              {config.gisFirm}
            </a>
          </li>
          <li>
            Отзывы 2ГИС:{' '}
            <a
              href={config.gisReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-glass)] underline underline-offset-2 break-anywhere"
            >
              {config.gisReviews}
            </a>
          </li>
          <li>
            Instagram:{' '}
            <a
              href={config.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-glass)] underline underline-offset-2 break-anywhere"
            >
              {config.instagram}
            </a>
          </li>
        </ul>
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
          Что добавить в карточку 2ГИС: ссылку на сайт с меткой <code>?src=2gis</code>, актуальные
          фотографии и ссылку на страницу записи на замер. Подробнее — в docs/SEO.md.
        </p>
      </Card>
    </div>
  );
}
