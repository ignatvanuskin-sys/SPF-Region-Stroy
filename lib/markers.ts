/**
 * lib/markers.ts — маркеры достоверности (раздел 3.3).
 *
 * Чистыми функции без JSX: те же строки ищет scripts/check-placeholders.mjs.
 */

export type MarkerKind = 'УТОЧНИТЬ' | 'ПОДТВЕРДИТЬ' | 'Добавить' | 'Уточнить';

/**
 * Ядро регулярного выражения совпадает со списком из раздела 2 и
 * scripts/check-placeholders.mjs:
 *   [УТОЧНИТЬ, [ПОДТВЕРДИТЬ, [Добавить, [Уточнить, TODO_CONTENT
 */
export const MARKER_PATTERN =
  /\[(УТОЧНИТЬ[^\]]*|ПОДТВЕРДИТЬ[^\]]*|Добавить[^\]]*|Уточнить[^\]]*)\]|TODO_CONTENT/g;

export const PLACEHOLDER_PREFIXES = [
  '[УТОЧНИТЬ',
  '[ПОДТВЕРДИТЬ',
  '[Добавить',
  '[Уточнить',
  'TODO_CONTENT',
] as const;

const EXPLANATIONS: Record<MarkerKind, string> = {
  'УТОЧНИТЬ': 'Требуется уточнить у компании: этого факта нет в реестре фактов.',
  'ПОДТВЕРДИТЬ':
    'Требуется подтверждение компании: факт правдоподобен, но не подтверждён.',
  'Добавить': 'Плейсхолдер портфолио: нужны материалы от компании.',
  'Уточнить': 'Плейсхолдер портфолио: нужны материалы от компании.',
};

export interface MarkerPart {
  type: 'text' | 'marker';
  value: string;
  kind?: MarkerKind;
  explanation?: string;
}

function kindOf(chunk: string): MarkerKind {
  if (chunk.startsWith('[УТОЧНИТЬ')) return 'УТОЧНИТЬ';
  if (chunk.startsWith('[ПОДТВЕРДИТЬ')) return 'ПОДТВЕРДИТЬ';
  if (chunk.startsWith('[Добавить')) return 'Добавить';
  if (chunk.startsWith('[Уточнить')) return 'Уточнить';
  if (chunk === 'TODO_CONTENT') return 'Добавить';
  return 'УТОЧНИТЬ';
}

/** Разбивает строку на обычный текст и маркеры. */
export function splitMarkers(input: string): MarkerPart[] {
  const parts: MarkerPart[] = [];
  let lastIndex = 0;
  const re = new RegExp(MARKER_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }
    const chunk = match[0];
    const kind = kindOf(chunk);
    parts.push({
      type: 'marker',
      value: chunk,
      kind,
      explanation: EXPLANATIONS[kind],
    });
    lastIndex = match.index + chunk.length;
  }

  if (lastIndex < input.length) {
    parts.push({ type: 'text', value: input.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: input }];
}

export function hasMarker(input: string): boolean {
  return new RegExp(MARKER_PATTERN.source).test(input);
}

/** Текст без маркеров — для <title>, meta description и JSON-LD. */
export function stripMarkers(input: string): string {
  return input.replace(new RegExp(MARKER_PATTERN.source, 'g'), '').replace(/\s{2,}/g, ' ').trim();
}
