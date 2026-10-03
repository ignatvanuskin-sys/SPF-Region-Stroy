'use client';

import { MarkerText } from '@/components/MarkerText';
import { track } from '@/lib/analytics';
import type { FaqItem } from '@/content/faq';

/** Аккордеон FAQ на нативном <details> (раздел 16.4). */
export function FaqList({ items, idPrefix = 'faq' }: { items: FaqItem[]; idPrefix?: string }) {
  return (
    <div className="border-t border-[color:var(--line)]">
      {items.map((item) => (
        <details
          key={item.id}
          id={`${idPrefix}-${item.id}`}
          className="faq"
          onToggle={(event) => {
            if ((event.currentTarget as HTMLDetailsElement).open) {
              track('faq_open', { question_id: item.id });
            }
          }}
        >
          <summary>{item.question}</summary>
          <div className="faq-body text-[16px]">
            <MarkerText text={item.answer} />
          </div>
        </details>
      ))}
    </div>
  );
}
