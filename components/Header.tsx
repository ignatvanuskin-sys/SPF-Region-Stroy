'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NAV_ITEMS, COMPANY_NAME } from '@/content/site';
import { CONTACTS } from '@/content/contacts';
import { CallButton, PhoneIcon, WhatsAppIcon } from '@/components/Cta';
import { telLink, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Закрываем меню при переходе.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Блокируем прокрутку под открытым меню.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[color:var(--bg)]/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-[color:var(--ink)]"
          aria-label={`${COMPANY_NAME} — на главную`}
        >
          <LogoMark />
          <span className="truncate">{COMPANY_NAME}</span>
        </Link>

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-[15px] text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Телефон виден в хедере всегда — не за бургером (раздел 17) */}
          <a
            href={telLink()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-[15px] font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent)] lg:hidden"
            onClick={() => track('click_phone', { placement: 'header' })}
            aria-label={`Позвонить ${CONTACTS.phone}`}
          >
            <PhoneIcon />
            <span className="hidden sm:inline tnum">{CONTACTS.phone}</span>
          </a>

          <div className="hidden lg:block">
            <a
              href={telLink()}
              className="tnum mr-4 text-[15px] font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent)]"
              onClick={() => track('click_phone', { placement: 'header' })}
            >
              {CONTACTS.phone}
            </a>
          </div>

          <a
            href={waLink({ context: 'general' })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--wa hidden min-h-[44px] px-4 py-2 text-[15px] lg:inline-flex"
            onClick={() => track('click_whatsapp', { placement: 'header', context: 'general' })}
          >
            WhatsApp
          </a>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[color:var(--line)] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Мобильное меню: ≤ 5 пунктов, без вложенности, крупные кнопки внизу */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-[color:var(--line)] bg-[color:var(--bg)] lg:hidden"
      >
        <div className="container-page py-4">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className="border-b border-[color:var(--line)] last:border-0">
                <Link
                  href={item.href}
                  className="flex min-h-[52px] items-center text-[17px] font-medium"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={waLink({ context: 'general' })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--wa w-full"
              onClick={() => track('click_whatsapp', { placement: 'header', context: 'general' })}
            >
              <WhatsAppIcon />
              Написать в WhatsApp
            </a>
            <CallButton placement="header" fullWidth label="Позвонить менеджеру" />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Логотип-текст: оконный модуль в линиях, один акцентный элемент. */
function LogoMark() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <rect x="1.5" y="1.5" width="23" height="23" rx="3" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M13 1.5v23" stroke="var(--ink)" strokeWidth="1" />
      <path d="M1.5 13h23" stroke="var(--ink)" strokeWidth="1" />
      <rect x="14.5" y="14.5" width="9" height="9" fill="var(--accent)" />
    </svg>
  );
}
