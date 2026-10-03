'use client';

import { ArrowRight } from 'lucide-react';

import { CATEGORIES } from '@/lib/validation';
import { track } from '@/lib/analytics';
import { setLeadIntent } from '@/lib/lead-intent';

/**
 * Первый шаг воронки: клиент приходит из 2ГИС и выбирает одно из трёх.
 * Выбор сразу подставляет категорию в форму заявки и ведёт к ней,
 * поэтому человек не ищет нужную страницу вручную.
 */
export function CategoryPicker({ compact = false }: { compact?: boolean }) {
  const select = (value: string, label: string) => {
    track('scenario_select', { scenario: value });
    // Сохраняем выбор до того, как форма появится в DOM.
    setLeadIntent(value);
    window.dispatchEvent(
      new CustomEvent('spf:category', { detail: { category: value, label } }),
    );
    document.getElementById('zayavka')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <ul className={compact ? 'grid gap-2' : 'grid gap-2.5'}>
      {CATEGORIES.map((category) => (
        <li key={category.value}>
          <button
            type="button"
            onClick={() => select(category.value, category.label)}
            className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors duration-200 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <span className="block">
              <span className="block text-[17px] font-semibold leading-snug">{category.label}</span>
              <span className="mt-0.5 block text-[14px] text-muted-foreground">{category.hint}</span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
              aria-hidden="true"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
