/**
 * lib/lead-intent.ts — выбранная категория до того, как форма смонтировалась.
 *
 * Зачем: форма подгружается ленивым чанком (next/dynamic). Если человек нажал
 * «Двери» в hero раньше, чем форма появилась в DOM, событие уходит в пустоту и
 * выбор теряется. Поэтому выбор дублируется в модуле и подхватывается при
 * монтировании формы.
 *
 * Хранилище намеренное в памяти модуля: это выбор внутри одной страницы,
 * он не должен переживать перезагрузку и не является персональными данными.
 */

export type LeadIntent = 'windows' | 'doors' | 'facade' | 'repair' | 'other';

let pending: string | null = null;

export function setLeadIntent(category: string): void {
  pending = category;
}

/** Возвращает сохранённый выбор и очищает его. */
export function consumeLeadIntent(): string | null {
  const value = pending;
  pending = null;
  return value;
}

/** Текущий выбор без очистки — для повторного открытия формы. */
export function peekLeadIntent(): string | null {
  return pending;
}
