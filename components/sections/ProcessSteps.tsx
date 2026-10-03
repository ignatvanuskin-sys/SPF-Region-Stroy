import { PROCESS_STEPS } from '@/content/process';
import { MarkerText } from '@/components/MarkerText';

/** 9.5. Как проходит работа. Нейтральная последовательность, без сроков и гарантий. */
export function ProcessSteps() {
  return (
    <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {PROCESS_STEPS.map((step) => (
        <li key={step.n} className="card p-5">
          <div className="flex items-baseline gap-3">
            <span
              className="tnum text-[22px] font-semibold text-[color:var(--accent)]"
              aria-hidden="true"
            >
              {String(step.n).padStart(2, '0')}
            </span>
            <h3 className="text-[18px]">{step.title}</h3>
          </div>
          <p className="mt-3 text-[15px] text-[color:var(--ink-2)]">
            <MarkerText text={step.text} />
          </p>
        </li>
      ))}
    </ol>
  );
}
