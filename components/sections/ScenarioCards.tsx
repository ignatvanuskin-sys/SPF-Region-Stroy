'use client';

import { useRouter } from 'next/navigation';

import { SCENARIOS, type Scenario } from '@/content/services';
import { SCENARIO_ILLUSTRATION } from '@/content/media';
import { ILLUSTRATIONS } from '@/components/illustrations';
import { MarkerText } from '@/components/MarkerText';
import { track } from '@/lib/analytics';

/**
 * 9.3. «Что вам нужно?».
 * Нажатие подставляет услугу в форму и в текст WhatsApp (scenario_select),
 * затем ведёт на страницу услуги.
 */
export function ScenarioCards() {
  const router = useRouter();
  const items = SCENARIOS.filter((s) => !s.hidden);

  const onSelect = (scenario: Scenario) => {
    track('scenario_select', { scenario: scenario.id });
    window.dispatchEvent(
      new CustomEvent('spf:service', {
        detail: { service: scenario.service, mode: scenario.waContext === 'measurement' ? 'measure' : 'quote' },
      }),
    );
    router.push(scenario.href);
  };

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((scenario) => {
        const Illustration = ILLUSTRATIONS[SCENARIO_ILLUSTRATION[scenario.id] ?? 'WindowSingle'];
        return (
          <li key={scenario.id} className="h-full">
            <button
              type="button"
              onClick={() => onSelect(scenario)}
              className="card card--interactive flex h-full w-full items-start gap-4 p-4 text-left"
            >
              <span className="w-14 shrink-0" aria-hidden="true">
                <Illustration ratio="3:2" />
              </span>
              <span className="block">
                <span className="block text-[17px] font-semibold">{scenario.title}</span>
                <span className="mt-1 block text-[15px] text-muted-foreground">
                  <MarkerText text={scenario.text} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
