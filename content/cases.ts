/**
 * content/cases.ts — портфолио (раздел 14).
 *
 * Не придумывать кейсы, названия объектов, даты и цифры.
 * В concept показываем структуру карточки с плейсхолдерами.
 * В production блок скрыт, пока нет минимум 3 реальных кейсов с фото.
 */

export interface CasePhoto {
  src: string | null;
  alt: string;
  /** 'before' | 'after' | undefined */
  kind?: 'before' | 'after';
}

export interface CaseItem {
  id: string;
  /** Тип объекта: квартира / дом / коммерческий объект. */
  objectType: string;
  /** Название кейса — только после получения от компании. */
  title: string;
  task: string;
  solution: string;
  constructions: string;
  result: string;
  photos: CasePhoto[];
}

/**
 * Пустой список: реальных кейсов и фото у агента нет.
 * Структура карточки описана типом CaseItem и компонентом CaseCard.
 */
export const CASES: CaseItem[] = [];

/** Минимум кейсов с фото для показа блока в production. */
export const MIN_CASES_FOR_PRODUCTION = 3;

const PLACEHOLDER_CASE: CaseItem = {
  id: 'template',
  objectType: 'Тип объекта: квартира / дом / коммерческий объект',
  title: '[Добавить описание проекта]',
  task: '[Добавить описание проекта]',
  solution: '[Добавить описание проекта]',
  constructions: '[Уточнить систему и сроки]',
  result: '[Добавить описание проекта]',
  photos: [
    { src: null, alt: '[Добавить фото объекта]' },
    { src: null, alt: '[Добавить фото объекта]', kind: 'before' },
    { src: null, alt: '[Добавить фото объекта]', kind: 'after' },
  ],
};

/**
 * Кейсы, которые рендерит страница:
 *  - concept: три карточки-шаблона, чтобы владелец увидел структуру;
 *  - production: только реальные кейсы (их пока нет).
 */
export function visibleCases(isConcept: boolean): CaseItem[] {
  if (isConcept) {
    return [1, 2, 3].map((i) => ({ ...PLACEHOLDER_CASE, id: `template-${i}` }));
  }
  return CASES;
}

export function portfolioVisible(isConcept: boolean, flagEnabled: boolean): boolean {
  if (!flagEnabled) return false;
  if (isConcept) return true;
  return CASES.filter((c) => c.photos.some((p) => p.src)).length >= MIN_CASES_FOR_PRODUCTION;
}

export const CTA_SIMILAR = 'Хочу похожее решение';
