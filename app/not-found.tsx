import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/card';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { MobileActionBar } from '@/components/site/mobile-action-bar';
import { SERVICES } from '@/content/services';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

/**
 * Страница «не найдено».
 *
 * Лежит в корне, поэтому её получает любой несуществующий адрес. Публичную
 * обвязку подключаем прямо здесь: корневой макет её не содержит (он общий с
 * админкой), а оставлять человека без навигации на ошибке — плохо.
 *
 * Ошибка — не тупик: даём прямые ссылки на услуги и контакты, чтобы посетитель
 * из поиска не закрыл вкладку, а дошёл до заявки.
 */
export default async function NotFound() {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);
  const waHref = `https://wa.me/${contacts.whatsappPrimary}`;

  return (
    <>
      <Header contacts={contacts} />
      <main id="main">
        <Section>
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
                Ошибка 404
              </p>
              <h1 className="mt-3 text-[2rem] font-extrabold tracking-tight sm:text-4xl">
                Такой страницы нет
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-soft)]">
                Возможно, ссылка устарела или в адресе опечатка. Выберите, что вам нужно — или напишите
                нам, поможем сориентироваться.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
                <ButtonLink href="/" variant="primary" size="lg">
                  На главную
                </ButtonLink>
                <ButtonLink
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  size="lg"
                >
                  Написать в WhatsApp
                </ButtonLink>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-3xl">
              <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Популярные разделы
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {SERVICES.map((service) => (
                  <li key={service.slug}>
                    <Link
                      href={`/${service.slug}`}
                      className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-[0.9375rem] font-medium transition-colors hover:border-[var(--color-glass)]"
                    >
                      {service.shortName}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/raschet"
                    className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-[0.9375rem] font-medium transition-colors hover:border-[var(--color-glass)]"
                  >
                    Рассчитать стоимость
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kontakty"
                    className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 text-[0.9375rem] font-medium transition-colors hover:border-[var(--color-glass)]"
                  >
                    Контакты
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </main>
      <Footer contacts={contacts} claims={claims} />
      <MobileActionBar contacts={contacts} />
    </>
  );
}
