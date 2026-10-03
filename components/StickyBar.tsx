'use client';

import { useEffect, useState } from 'react';

import { telLink, waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { PhoneIcon, WhatsAppIcon } from '@/components/Cta';

/**
 * Липкая нижняя панель (раздел 17): WhatsApp (--wa) + «Позвонить», высота 56px,
 * учёт env(safe-area-inset-bottom).
 * Панель прячется, когда пользователь работает с формой или открыта клавиатура.
 */
export function StickyBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        setHidden(true);
      }
    };
    const onFocusOut = () => setHidden(false);

    let vvCleanup: (() => void) | undefined;
    const vv = window.visualViewport;
    if (vv) {
      const onResize = () => {
        // Клавиатура открыта, если видимая высота заметно меньше окна.
        setHidden(window.innerHeight - vv.height > 150);
      };
      vv.addEventListener('resize', onResize);
      vvCleanup = () => vv.removeEventListener('resize', onResize);
    }

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      vvCleanup?.();
    };
  }, []);

  return (
    <div className={`sticky-bar ${hidden ? 'is-hidden' : ''}`} role="group" aria-label="Быстрая связь">
      <a
        href={waLink({ context: 'general' })}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--wa flex-1"
        style={{ minHeight: 56 }}
        onClick={() => track('click_whatsapp', { placement: 'sticky', context: 'general' })}
      >
        <WhatsAppIcon />
        WhatsApp
      </a>
      <a
        href={telLink()}
        className="btn btn--secondary flex-1 bg-[color:var(--bg)]"
        style={{ minHeight: 56 }}
        onClick={() => track('click_phone', { placement: 'sticky' })}
      >
        <PhoneIcon />
        Позвонить
      </a>
    </div>
  );
}
