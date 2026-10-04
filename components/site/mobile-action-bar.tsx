'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calculator, MessageCircle, Phone } from 'lucide-react';
import { formatTel, type Contacts } from '@/components/site/contact-types';
import { track } from '@/lib/tracking';
import { cn } from '@/lib/utils';

/**
 * Закреплённая нижняя панель на мобильном (§7).
 *
 * Три главных действия всегда под большим пальцем: позвонить, написать в
 * WhatsApp, рассчитать. Панель:
 *   • не перекрывает контент — страницы добавляют отступ `.pb-mobile-bar`;
 *   • прячется, когда открыта экранная клавиатура (иначе перекрывает поля);
 *   • скрыта на десктопе, где те же действия есть в шапке;
 *   • учитывает безопасную зону iPhone через env(safe-area-inset-bottom).
 */
export function MobileActionBar({ contacts }: { contacts: Contacts }) {
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    const isTextField = (element: Element | null) => {
      if (!element) return false;
      const tag = element.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isTextField(event.target as Element) && window.innerWidth < 1024) setKeyboardOpen(true);
    };
    const onFocusOut = () => setKeyboardOpen(false);

    // Дополнительный сигнал: экранная клавиатура уменьшает визуальный вьюпорт.
    let initialHeight = window.visualViewport?.height ?? window.innerHeight;
    const onViewportResize = () => {
      const current = window.visualViewport?.height ?? window.innerHeight;
      if (current > initialHeight) initialHeight = current;
      setKeyboardOpen(current < initialHeight - 140);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    window.visualViewport?.addEventListener('resize', onViewportResize);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    };
  }, []);

  const waHref = `https://wa.me/${contacts.whatsappPrimary}?text=${encodeURIComponent(
    'Здравствуйте! Пишу с сайта, интересуют окна и витражи.',
  )}`;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-bg)_96%,transparent)] backdrop-blur-md transition-transform duration-200 lg:hidden',
        keyboardOpen && 'translate-y-full',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-hidden={keyboardOpen}
    >
      <nav aria-label="Быстрые действия" className="grid grid-cols-3 gap-1 px-2 py-2">
        <a
          href={`tel:${contacts.phonePrimary}`}
          onClick={() => track('call_click', { place: 'mobile_bar' })}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-[0.75rem] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-alt)]"
          tabIndex={keyboardOpen ? -1 : undefined}
        >
          <Phone className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
          Позвонить
          <span className="sr-only">{formatTel(contacts.phonePrimary)}</span>
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp_click', { place: 'mobile_bar' })}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-[0.75rem] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-alt)]"
          tabIndex={keyboardOpen ? -1 : undefined}
        >
          <MessageCircle className="size-5 text-[var(--color-glass)]" aria-hidden="true" />
          WhatsApp
        </a>
        <Link
          href="/raschet"
          onClick={() => track('cta_click', { button: 'mobile_bar_calc' })}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-[0.75rem] font-bold text-[var(--color-cta-ink)]"
          style={{ backgroundColor: 'var(--color-cta)' }}
          tabIndex={keyboardOpen ? -1 : undefined}
        >
          <Calculator className="size-5" aria-hidden="true" />
          Рассчитать
        </Link>
      </nav>
    </div>
  );
}
