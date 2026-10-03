'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, MessageCircle, Phone, X } from 'lucide-react';

import { NAV_ITEMS, COMPANY_NAME } from '@/content/site';
import { CONTACTS } from '@/content/contacts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { telLink, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';

/**
 * Хедер: тонкая полоса с индикатором прочтения страницы.
 * Телефон виден всегда — не за бургером.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Индикатор прочтения: обновляется в requestAnimationFrame, без лишних ререндеров.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight"
          aria-label={`${COMPANY_NAME} — на главную`}
        >
          <LogoMark />
          <span className="truncate text-[15px]">{COMPANY_NAME}</span>
        </Link>

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={telLink()}
            onClick={() => track('click_phone', { placement: 'header' })}
            className="tnum inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-[15px] font-semibold transition-colors duration-200 hover:text-primary lg:hidden"
            aria-label={`Позвонить ${CONTACTS.phone}`}
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
            <span className="hidden sm:inline">{CONTACTS.phone}</span>
          </a>

          <a
            href={telLink()}
            onClick={() => track('click_phone', { placement: 'header' })}
            className="tnum mr-2 hidden text-[15px] font-semibold transition-colors duration-200 hover:text-primary lg:inline"
          >
            {CONTACTS.phone}
          </a>

          <Button asChild variant="wa" size="sm" className="hidden lg:inline-flex">
            <a
              href={waLink({ context: 'general' })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('click_whatsapp', { placement: 'header', context: 'general' })}
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
              WhatsApp
            </a>
          </Button>

          <button
            type="button"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors duration-200 hover:border-primary lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Индикатор прочтения страницы */}
      <div
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent transition-transform duration-100 ease-out"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />

      <div id="mobile-menu" hidden={!open} className="border-t border-border bg-background lg:hidden">
        <div className="shell py-4">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className="border-b border-border last:border-0">
                <Link
                  href={item.href}
                  className={cn(
                    'flex min-h-[52px] items-center text-[17px] font-medium',
                    pathname === item.href && 'text-primary',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="wa" size="lg">
              <a
                href={waLink({ context: 'general' })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('click_whatsapp', { placement: 'header', context: 'general' })}
              >
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                Написать в WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={telLink()} onClick={() => track('click_phone', { placement: 'header' })}>
                <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
                Позвонить менеджеру
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Логотип-текст: оконный модуль; акцентный квадрат — деталь малой площади. */
function LogoMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 text-foreground"
    >
      <rect x="1.5" y="1.5" width="23" height="23" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 1.5v23" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 13h23" stroke="currentColor" strokeWidth="1" />
      <rect x="14.5" y="14.5" width="9" height="9" className="fill-accent" />
    </svg>
  );
}
