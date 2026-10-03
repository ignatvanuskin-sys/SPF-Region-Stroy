'use client';

import { NOTES } from '@/content/notes';
import { ILLUSTRATIONS } from '@/components/illustrations';
import { MarkerText } from '@/components/MarkerText';
import { CTA_SIMILAR, type CaseItem } from '@/content/cases';

/**
 * 9.8 / 14. Портфолио.
 * Мобильный — вертикальный список, десктоп — сетка 2–3 колонки, без каруселей.
 * Кейсы не придумываем: в concept это структура карточки с плейсхолдерами.
 */
export function PortfolioSection({ cases }: { cases: CaseItem[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {cases.map((item) => (
        <li key={item.id} className="card flex h-full flex-col p-5">
          <p className="text-[14px] font-medium text-muted-foreground">
            <MarkerText text={item.objectType} />
          </p>
          <h3 className="mt-2">
            <MarkerText text={item.title} />
          </h3>

          <dl className="mt-4 space-y-3 text-[15px]">
            <Row label="Задача клиента" value={item.task} />
            <Row label="Выбранное решение" value={item.solution} />
            <Row label="Использованные конструкции" value={item.constructions} />
            <Row label="Результат" value={item.result} />
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
            {item.photos.map((photo, i) => {
              const Illustration =
                ILLUSTRATIONS[i === 1 ? 'WindowSingle' : i === 2 ? 'FacadeGrid' : 'WindowDouble'];
              return (
                <div
                  key={i}
                  className="rounded-[10px] border border-border bg-muted p-2"
                >
                  <Illustration ratio="3:2" />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            <MarkerText text={NOTES.addObjectPhoto} /> — 3–8 реальных фото, по возможности
            до/после.
          </p>

          <div className="mt-5 pt-1">
            <button
              type="button"
              className="btn btn--secondary min-h-[44px] px-4 py-2 text-[15px]"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('spf:service', {
                    detail: { service: 'Похожее решение по кейсу', mode: 'quote' },
                  }),
                );
                document.getElementById('zayavka')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {CTA_SIMILAR}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[14px] font-medium text-muted-foreground">{label}</dt>
      <dd className="text-muted-foreground">
        <MarkerText text={value} />
      </dd>
    </div>
  );
}
