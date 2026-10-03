import Link from 'next/link';

import { CallButton, WaButton } from '@/components/Cta';
import { NAV_ITEMS } from '@/content/site';

export const metadata = {
  title: 'Страница не найдена · СПФ Регион Строй',
  robots: { index: false, follow: false },
};

/** Своя 404 со кнопками WhatsApp и «Позвонить» (раздел 8). */
export default function NotFound() {
  return (
    <section className="container-page py-16 md:py-24">
      <p className="text-[14px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Ошибка 404
      </p>
      <h1 className="mt-3">Страница не найдена</h1>
      <p className="mt-4 max-w-[60ch] text-[17px] text-muted-foreground">
        Возможно, ссылка устарела. Посмотрите услуги или свяжитесь с менеджером — подскажем, что
        вам нужно.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <WaButton context="general" placement="error_page" />
        <CallButton placement="error_page" />
      </div>

      <nav aria-label="Разделы сайта" className="mt-10">
        <ul className="flex flex-wrap gap-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
