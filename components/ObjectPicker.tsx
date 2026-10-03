'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { OBJECT_SCENARIOS, type ObjectScenario } from '@/content/objects';
import { SERVICES } from '@/content/services';
import { ILLUSTRATIONS } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { setLeadIntent } from '@/lib/lead-intent';

/**
 * Раздел 2 брифа: выбор по типу объекта.
 *
 * Сначала человек узнаёт свой объект — и только потом видит подходящие услуги
 * и CTA. Выбор передаётся в квиз: он открывается с уже отмеченным объектом,
 * поэтому первый шаг проходится в один клик.
 */
export function ObjectPicker() {
  const [active, setActive] = useState<string>(OBJECT_SCENARIOS[0].id);
  const scenario = OBJECT_SCENARIOS.find((o) => o.id === active) ?? OBJECT_SCENARIOS[0];

  const services = scenario.serviceIds
    .map((id) => SERVICES.find((s) => s.id === id))
    .filter((s): s is (typeof SERVICES)[number] => Boolean(s));

  const select = (item: ObjectScenario) => {
    setActive(item.id);
    setLeadIntent(item.id);
    // Если квиз уже смонтирован, модульное значение он не увидит:
    // сообщаем ему событием.
    window.dispatchEvent(new CustomEvent('spf:object', { detail: { object: item.id } }));
    track('object_select', { object: item.id, extendedBrief: item.extendedBrief });
  };

  return (
    <div>
      {/* Переключатель объектов */}
      <div
        role="tablist"
        aria-label="Тип объекта"
        className="scroll-x flex gap-2 border-b border-border pb-4"
      >
        {OBJECT_SCENARIOS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === active}
            onClick={() => select(item)}
            className={cn(
              'min-h-[46px] shrink-0 cursor-pointer rounded-full border px-5 text-[15px] font-medium transition-colors duration-200',
              item.id === active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary',
            )}
          >
            {item.title}
          </button>
        ))}
      </div>

      {/* Содержимое выбранного объекта */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div>
          <h3 className="font-display text-[22px] font-semibold">{scenario.title}</h3>
          <p className="mt-2 text-[17px] text-muted-foreground">{scenario.summary}</p>

          <div className="mt-6">
            <p className="eyebrow">Обычно нужно</p>
            <ul className="mt-3 space-y-2">
              {scenario.typical.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[16px]">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <p className="eyebrow">Уточним на первом контакте</p>
            <ul className="mt-3 space-y-2 text-[16px] text-muted-foreground">
              {scenario.ask.map((item) => (
                <li key={item} className="border-b border-border pb-2 last:border-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="#raschet" scroll>
                Получить консультацию
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            {scenario.extendedBrief && (
              <Button asChild variant="outline" size="lg">
                <Link href="/fasadnoe-ostekleniye">Расширенный бриф для фасада</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Визуал и услуги объекта */}
        <div>
          <ScenarioIllustration name={scenario.illustration} />

          <p className="eyebrow mt-7">Подходящие услуги</p>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  href={service.href ?? '#raschet'}
                  scroll={!service.href}
                  className="group flex min-h-[56px] items-center justify-between gap-4 py-3 transition-colors duration-200 hover:text-primary"
                >
                  <span>
                    <span className="block font-display text-[16px] font-semibold">
                      {service.title}
                    </span>
                    <span className="mt-0.5 block text-[14px] text-muted-foreground">
                      {service.task}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScenarioIllustration({ name }: { name: ObjectScenario['illustration'] }) {
  const Illustration = ILLUSTRATIONS[name];
  if (!Illustration) return null;

  return (
    <div className="border border-border bg-secondary/50 p-6">
      <Illustration className="h-auto w-full" ratio="3:2" />
      <p className="mt-4 text-[12px] text-muted-foreground">
        Схема. Фотографии по этому типу объектов появятся после получения от компании.
      </p>
    </div>
  );
}
