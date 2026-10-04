import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { NAV, NAV_SECONDARY } from '@/content/site';
import { BrandMark } from '@/components/site/header';
import { formatTel, type Contacts } from '@/components/site/contact-types';
import type { ResolvedClaim } from '@/lib/domain/claims';

/**
 * Подвал. Реквизиты (БИН и т. д.) не публикуем, пока владелец не подтвердит
 * утверждение `legal_requisites` — это требование §3, а не забывчивость.
 */
export function Footer({
  contacts,
  claims,
}: {
  contacts: Contacts;
  claims: Record<string, ResolvedClaim>;
}) {
  const year = new Date().getFullYear();
  const legal = claims['legal_requisites'];
  const legalRequisites = legal?.confirmed ? legal.textRu : null;

  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface-alt)] pb-mobile-bar">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-base font-extrabold tracking-tight">{contacts.name}</span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Металлопластиковые и алюминиевые окна, входные двери, фасадные витражи и перегородки.
            Производство, розница и опт.
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {contacts.workingHoursText ?? 'Режим работы уточняйте у менеджера'}
          </p>
        </div>

        <nav aria-label="Услуги" className="space-y-2.5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Услуги
          </p>
          {NAV.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-glass)]"
              >
                {item.label}
              </Link>
            </div>
          ))}
        </nav>

        <nav aria-label="Разделы" className="space-y-2.5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Компания
          </p>
          {NAV_SECONDARY.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-glass)]"
              >
                {item.label}
              </Link>
            </div>
          ))}
          <div>
            <Link
              href="/raschet"
              className="text-sm font-semibold text-[var(--color-glass)] transition-colors hover:underline"
            >
              Рассчитать стоимость
            </Link>
          </div>
        </nav>

        <div className="space-y-3">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Контакты
          </p>
          <a
            href={`tel:${contacts.phonePrimary}`}
            className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-[var(--color-glass)]"
          >
            <Phone className="size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
            {formatTel(contacts.phonePrimary)}
          </a>
          <a
            href={`https://wa.me/${contacts.whatsappPrimary}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--color-glass)]"
          >
            <MessageCircle className="size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
            WhatsApp
          </a>
          <a
            href={`mailto:${contacts.email}`}
            className="flex items-center gap-2 text-sm break-anywhere transition-colors hover:text-[var(--color-glass)]"
          >
            <Mail className="size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
            {contacts.email}
          </a>
          <p className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
            {contacts.address}
          </p>
          <a
            href={contacts.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-glass)]"
          >
            Instagram @spf01002
          </a>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)]">
        <div className="container-page flex flex-col gap-3 py-5 text-[0.8125rem] text-[var(--color-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {contacts.name}. Все права защищены.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={contacts.gisFirm}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--color-glass)]"
            >
              Мы в 2ГИС
            </a>
            <Link href="/politika" className="transition-colors hover:text-[var(--color-glass)]">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
        {legalRequisites ? (
          <div className="container-page pb-5 text-[0.8125rem] text-[var(--color-ink-muted)]">{legalRequisites}</div>
        ) : null}
      </div>
    </footer>
  );
}
