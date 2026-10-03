import { PROCESS_STEPS } from '@/content/process';
import { MarkerText } from '@/components/MarkerText';

/**
 * Раздел 6 брифа: как проходит работа — 9 этапов.
 *
 * На десктопе это горизонтальная лента с соединительной линией и бронзовыми
 * номерами, на мобильном — вертикальный список. Никаких сроков и гарантий:
 * неподтверждённые условия помечены маркером прямо в тексте этапа.
 */
export function ProcessSteps() {
  return (
    <div>
      {/* Десктоп: горизонтальная лента */}
      <ol className="hidden lg:grid lg:grid-cols-3 lg:gap-x-10">
        {PROCESS_STEPS.map((step) => (
          <li
            key={step.n}
            className="relative border-t border-border pb-10 pt-5 [&:nth-child(3n)]:border-t-border"
          >
            <span
              className="absolute -top-px left-0 h-[2px] w-10 bg-accent"
              aria-hidden="true"
            />
            <div className="flex items-baseline gap-3">
              <span className="tnum font-display text-[13px] font-bold tracking-[0.14em] text-accent">
                {String(step.n).padStart(2, '0')}
              </span>
              <h3 className="font-display text-[18px] font-semibold">{step.title}</h3>
            </div>
            <p className="mt-2.5 text-[15px] text-muted-foreground">
              <MarkerText text={step.text} />
            </p>
          </li>
        ))}
      </ol>

      {/* Мобильный: вертикальный список */}
      <ol className="lg:hidden">
        {PROCESS_STEPS.map((step) => (
          <li
            key={step.n}
            className="flex min-w-0 gap-4 border-b border-border py-4 last:border-0"
          >
            <span className="tnum mt-0.5 shrink-0 font-display text-[13px] font-bold tracking-[0.14em] text-accent">
              {String(step.n).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-[17px] font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-[15px] text-muted-foreground">
                <MarkerText text={step.text} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
