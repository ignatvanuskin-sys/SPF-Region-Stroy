import { MapPin, Navigation } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import type { Contacts } from '@/components/site/contact-types';

/**
 * Блок карты без тяжёлого виджета (§6.5).
 *
 * Встраивать интерактивную карту сразу — значит платить за это временем
 * загрузки и LCP. Поэтому здесь схематичное поле в стиле «оконной рамы» с
 * координатами и двумя кнопками: открыть карточку в 2ГИС и построить маршрут.
 * Интерактивная карта, если понадобится, подключается отдельным компонентом
 * и ленивой загрузкой.
 */
export function MapBlock({
  contacts,
  lat,
  lng,
}: {
  contacts: Contacts;
  lat: number;
  lng: number;
}) {
  // Стандартный формат ссылки 2ГИС на маршрут: /directions/points/|<lon>,<lat>
  const routeUrl = `https://2gis.kz/astana/directions/points/%7C${lng}%2C${lat}`;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div
        className="frame-grid relative flex h-52 items-center justify-center bg-[var(--color-surface-alt)]"
        role="img"
        aria-label={`Схема расположения: ${contacts.address}`}
      >
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-center shadow-[var(--shadow-card)]">
          <MapPin className="mx-auto size-5 text-[var(--color-cta)]" aria-hidden="true" />
          <p className="mt-1.5 text-sm font-semibold">{contacts.addressShort}</p>
          <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <p className="font-semibold">{contacts.address}</p>
        <ul className="space-y-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-soft)]">
          <li>Остановка «Астана технопарк» — около 500 м, примерно 5 минут пешком.</li>
          <li>Парковка: 6 мест.</li>
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink
            href={contacts.gisFirm}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            size="sm"
          >
            <MapPin className="size-4" aria-hidden="true" />
            Открыть в 2ГИС
          </ButtonLink>
          <ButtonLink
            href={routeUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
          >
            <Navigation className="size-4" aria-hidden="true" />
            Построить маршрут
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
