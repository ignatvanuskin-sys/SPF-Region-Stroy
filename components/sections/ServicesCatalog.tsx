import Link from 'next/link';

import { CATALOG, type CatalogItem } from '@/content/services';
import { MarkerText } from '@/components/MarkerText';
import { WaButton } from '@/components/Cta';

/**
 * 9.4. Каталог услуг.
 * Название, короткое описание, «кому подходит», применение, CTA.
 * Без технических характеристик, брендов и цен.
 */
export function ServicesCatalog({ items = CATALOG }: { items?: CatalogItem[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="card flex h-full flex-col p-5">
          <h3>
            <Link href={item.href} className="hover:text-[color:var(--accent)]">
              {item.name}
            </Link>
          </h3>

          <p className="mt-3 text-[15px] text-[color:var(--ink-2)]">
            <MarkerText text={item.short} />
          </p>

          <dl className="mt-4 space-y-2 text-[14px]">
            <div>
              <dt className="font-medium text-[color:var(--muted)]">Кому подходит</dt>
              <dd className="text-[color:var(--ink-2)]">{item.who}</dd>
            </div>
            <div>
              <dt className="font-medium text-[color:var(--muted)]">Применение</dt>
              <dd className="text-[color:var(--ink-2)]">
                <MarkerText text={item.apply} />
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2 pt-1">
            {item.ctaAction === 'wa' ? (
              <WaButton
                context={item.waContext}
                subject={item.name}
                placement="service_page"
                label={item.cta}
                className="min-h-[44px] px-4 py-2 text-[15px]"
              />
            ) : (
              <Link
                href="#zayavka"
                scroll
                className="btn btn--primary min-h-[44px] px-4 py-2 text-[15px]"
              >
                {item.cta}
              </Link>
            )}
            <Link
              href={item.href}
              className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]"
            >
              Подробнее
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
