import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { MobileActionBar } from '@/components/site/mobile-action-bar';
import { CookieBanner } from '@/components/site/cookie-banner';
import { Analytics } from '@/components/site/analytics';
import { LocalBusinessJsonLd } from '@/components/site/structured-data';
import { getSiteConfig } from '@/lib/domain/settings';
import { getClaims } from '@/lib/domain/claims';
import { toContacts } from '@/lib/site-view';

/**
 * Обвязка публичных страниц.
 *
 * Вынесена из корневого макета в отдельную группу маршрутов `(site)`, чтобы
 * админка не тащила за собой публичную шапку, подвал и счётчики аналитики.
 *
 * Данные читаются один раз на запрос: `getSiteConfig` и `getClaims` обёрнуты в
 * `cache()`, поэтому несколько компонентов не делают несколько одинаковых
 * обращений к хранилищу.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig();
  const claims = await getClaims();
  const contacts = toContacts(config);

  return (
    <>
      {/* Ссылка для клавиатуры: пропустить навигацию и сразу к содержимому */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-[var(--color-ink)] focus:px-4 focus:py-2 focus:text-[var(--color-bg)]"
      >
        Перейти к содержимому
      </a>

      <Header contacts={contacts} />
      <main id="main">{children}</main>
      <Footer contacts={contacts} claims={claims} />
      <MobileActionBar contacts={contacts} />
      <CookieBanner />
      <Analytics
        ids={{
          ym: config.analytics.ymCounterId,
          ga4: config.analytics.ga4Id,
          meta: config.analytics.metaPixelId,
        }}
      />
      <LocalBusinessJsonLd
        contacts={contacts}
        workingHoursText={claims.working_hours?.confirmed ? claims.working_hours.textRu : null}
        sameAs={[contacts.instagram, contacts.gisFirm]}
      />
    </>
  );
}
