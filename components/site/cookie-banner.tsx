'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { readConsent, saveConsent } from '@/lib/tracking';

/**
 * Баннер согласия на cookie (§15).
 *
 * Обязательные cookie работают всегда — они нужны для сессии админки и защиты
 * форм. Аналитика и пиксели подключаются только после явного согласия, поэтому
 * кнопка «Только необходимые» равнозначна по размеру и заметности.
 */
export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Показываем только если решения ещё не было. Небольшая задержка, чтобы
    // баннер не сдвигал вёрстку во время первой отрисовки (CLS).
    const timer = window.setTimeout(() => {
      if (!readConsent()) setVisible(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const decide = (analytics: boolean, source: string) => {
    saveConsent(analytics);
    setVisible(false);
    window.dispatchEvent(new CustomEvent('spf:track', { detail: { name: 'consent_decided', source } }));
  };

  return (
    <div
      role="dialog"
      aria-label="Согласие на использование cookie"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lift)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md lg:bottom-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <p className="text-sm font-semibold text-[var(--color-ink)]">Cookie и аналитика</p>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-soft)]">
        Обязательные cookie нужны для работы форм и защиты от спама. Аналитику подключаем только с вашего
        согласия — она помогает понять, какие услуги интересны.{' '}
        <Link href="/politika" className="text-[var(--color-glass)] underline underline-offset-2">
          Подробнее
        </Link>
      </p>
      <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="sm" block onClick={() => decide(false, 'necessary_only')}>
          Только необходимые
        </Button>
        <Button variant="primary" size="sm" block onClick={() => decide(true, 'allow_analytics')}>
          Разрешить аналитику
        </Button>
      </div>
    </div>
  );
}
