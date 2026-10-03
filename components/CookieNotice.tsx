'use client';

import { useEffect, useState } from 'react';

import { getConsent, setConsent } from '@/lib/analytics';
import { GA_ID, YM_ID } from '@/content/site';

/**
 * Простое уведомление о cookies (раздел 20).
 * Показывается только если аналитика вообще настроена. Отказ полностью
 * отключает аналитику — скрипты не загружаются.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const analyticsConfigured = Boolean(GA_ID || YM_ID);
    if (!analyticsConfigured) return;
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (value: 'accepted' | 'declined') => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Уведомление о cookies"
      className="fixed bottom-[76px] left-3 right-3 z-40 rounded-[10px] border border-border bg-background p-4 shadow-sm lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-[420px]"
    >
      <p className="text-[15px] text-muted-foreground">
        Мы используем cookies для статистики посещений.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn--primary min-h-[44px] px-4 py-2" onClick={() => decide('accepted')}>
          Принять
        </button>
        <button
          type="button"
          className="btn btn--secondary min-h-[44px] px-4 py-2"
          onClick={() => decide('declined')}
        >
          Отклонить
        </button>
      </div>
    </div>
  );
}
