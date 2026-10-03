'use client';

import { useState } from 'react';

import { CONTACTS } from '@/content/contacts';
import { COORDS, MAP_EMBED_URL, TWOGIS, MAP_ROUTE_URL } from '@/content/twogis';
import { track } from '@/lib/analytics';

/**
 * 12. Карта грузится только по клику (раздел 17): карточка-заглушка
 * с адресом, затем iframe без API-ключа. События click_2gis, click_map_route.
 */
export function MapLazy() {
  const [shown, setShown] = useState(false);

  return (
    <div>
      <div className="card overflow-hidden">
        {shown ? (
          <iframe
            title={`Карта: ${CONTACTS.addressFull}`}
            src={MAP_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[320px] w-full border-0 md:h-[420px]"
          />
        ) : (
          <div className="flex h-[220px] flex-col items-center justify-center gap-3 bg-muted p-6 text-center md:h-[320px]">
            <p className="text-[16px] font-semibold">{CONTACTS.addressLines[0]}</p>
            <p className="text-[15px] text-muted-foreground">{CONTACTS.addressLines[1]}</p>
            <p className="text-[13px] text-muted-foreground tnum">
              {COORDS[1]}, {COORDS[0]}
            </p>
            <button type="button" className="btn btn--secondary mt-1" onClick={() => setShown(true)}>
              Показать карту
            </button>
            <p className="text-[13px] text-muted-foreground">
              Карта загружается только по нажатию.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={TWOGIS.firmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]"
          onClick={() => track('click_2gis', { placement: 'contacts' })}
        >
          Открыть в 2ГИС
        </a>
        <a
          href={MAP_ROUTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]"
          onClick={() => track('click_map_route', { placement: 'contacts' })}
        >
          Построить маршрут
        </a>
      </div>

      <p className="mt-3 text-[13px] text-muted-foreground">{CONTACTS.landmark}</p>
    </div>
  );
}
