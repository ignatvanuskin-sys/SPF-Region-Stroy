'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { waLink, telLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';

/**
 * Липкая панель действий на мобильных: WhatsApp + звонок.
 * Прячется, когда открыта клавиатура или пользователь работает с полями формы,
 * чтобы не перекрывать ввод.
 */
export function ActionBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') setHidden(true);
    };
    const onFocusOut = () => setHidden(false);

    let vvCleanup: (() => void) | undefined;
    const vv = window.visualViewport;
    if (vv) {
      const onResize = () => setHidden(window.innerHeight - vv.height > 150);
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
    <div className="action-bar" data-hidden={hidden} role="group" aria-label="Быстрая связь">
      <Button asChild variant="wa" size="lg" className="flex-1">
        <a
          href={waLink({ context: 'general' })}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('click_whatsapp', { placement: 'sticky', context: 'general' })}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="lg" className="flex-1">
        <a href={telLink()} onClick={() => track('click_phone', { placement: 'sticky' })}>
          <Phone className="h-5 w-5" aria-hidden="true" />
          Позвонить
        </a>
      </Button>
    </div>
  );
}
