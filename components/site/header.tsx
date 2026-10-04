'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Phone, X } from 'lucide-react';
import { NAV, NAV_SECONDARY } from '@/content/site';
import { Button, ButtonLink } from '@/components/ui/button';
import { formatTel, type Contacts } from '@/components/site/contact-types';
import { track } from '@/lib/tracking';
import { cn } from '@/lib/utils';

/**
 * Шапка сайта.
 *
 * Мобильная версия: кнопка меню открывает панель на весь экран, фон
 * блокируется от прокрутки, Escape закрывает, фокус возвращается на кнопку.
 * Две главные кнопки («Рассчитать» и «WhatsApp») продублированы в закреплённой
 * нижней панели, поэтому в шапке на телефоне оставлены только меню и звонок.
 */
export function Header({ contacts }: { contacts: Contacts }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const telHref = `tel:${contacts.phonePrimary}`;
  const waHref = `https://wa.me/${contacts.whatsappPrimary}`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${contacts.name} — на главную`}>
          <BrandMark />
          <span className="flex flex-col leading-none">
            <span className="text-[0.95rem] font-extrabold tracking-tight">{contacts.name}</span>
            <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Астана · окна и витражи
            </span>
          </span>
        </Link>

        <nav aria-label="Основная навигация" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={cn(
                'rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-glass)]',
                pathname === item.href ? 'text-[var(--color-glass)]' : 'text-[var(--color-ink-soft)]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={telHref}
            onClick={() => track('call_click', { place: 'header' })}
            className="hidden items-center gap-2 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:text-[var(--color-glass)] sm:flex"
          >
            <Phone className="size-4" aria-hidden="true" />
            {formatTel(contacts.phonePrimary)}
          </a>
          <ButtonLink
            href="/raschet"
            variant="cta"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => track('cta_click', { button: 'header_calc' })}
          >
            Рассчитать стоимость
          </ButtonLink>
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-[var(--color-line)] bg-[var(--color-bg)] lg:hidden"
        >
          <nav aria-label="Мобильная навигация" className="container-page flex flex-col gap-1 py-6">
            <p className="px-2 pb-1 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Услуги
            </p>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center rounded-[var(--radius-md)] px-2 text-base font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-glass)]"
              >
                {item.label}
              </Link>
            ))}
            <div className="rule-glass my-3" />
            <p className="px-2 pb-1 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Компания
            </p>
            {NAV_SECONDARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center rounded-[var(--radius-md)] px-2 text-base font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-glass)]"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-5 grid gap-2.5">
              <ButtonLink href="/raschet" variant="cta" size="lg" block>
                Рассчитать стоимость
              </ButtonLink>
              <ButtonLink
                href={waHref}
                variant="outline"
                size="lg"
                block
                onClick={() => track('whatsapp_click', { place: 'mobile_menu' })}
              >
                Написать в WhatsApp
              </ButtonLink>
              <ButtonLink href={telHref} variant="ghost" size="lg" block>
                {formatTel(contacts.phonePrimary)}
              </ButtonLink>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/**
 * Логотип-мотив: оконная рама со створкой. Геометрия, а не эмодзи —
 * рисуем SVG, чтобы он масштабировался и попадал в палитру.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8 shrink-0', className)}
      role="img"
      aria-label="Оконная рама — логотип"
    >
      <rect x="3" y="3" width="26" height="26" rx="3" fill="none" stroke="var(--color-ink)" strokeWidth="2" />
      <line x1="16" y1="3" x2="16" y2="29" stroke="var(--color-ink)" strokeWidth="2" />
      <line x1="3" y1="16" x2="29" y2="16" stroke="var(--color-ink)" strokeWidth="2" />
      <path d="M16 3 L29 3 L29 16 Z" fill="var(--color-glass)" opacity="0.16" />
      <path d="M3 16 L16 16 L16 29 Z" fill="var(--color-cta)" opacity="0.18" />
    </svg>
  );
}
