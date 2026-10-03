/**
 * lib/i18n.ts — каркас двуязычности (раздел 18).
 *
 * Правила:
 *  - казахские тексты НЕ переводятся автоматически; в kk.json значения пустые
 *    и помечены _status: needs_native_review;
 *  - пока словарь пуст, переключатель языка не показывается и маршруты /kk
 *    не отдаются;
 *  - включается только флагом KK_ENABLED=true после проверки носителем.
 */

import ru from '@/messages/ru.json';
import kk from '@/messages/kk.json';

export type Locale = 'ru' | 'kk';

type Dict = Record<string, unknown>;

export const DICTIONARIES: Record<Locale, Dict> = {
  ru: ru as Dict,
  kk: kk as Dict,
};

/** Любое пустое значение в словаре означает «перевод не готов». */
function hasEmptyValue(node: unknown): boolean {
  if (typeof node === 'string') return node.trim() === '';
  if (node && typeof node === 'object') {
    return Object.entries(node as Dict)
      .filter(([key]) => !key.startsWith('_'))
      .some(([, value]) => hasEmptyValue(value));
  }
  return false;
}

/** Готов ли казахский словарь к показу. */
export function isKkReady(): boolean {
  return !hasEmptyValue(kk);
}

/**
 * Переключатель языка показывается, только если флаг включён И словарь заполнен.
 * Роутинг /kk/... — подготовленная точка интеграции: он включается тем же
 * условием, потому что до этого казахских текстов для показа не существует.
 */
export function isLanguageSwitcherVisible(kkEnabled: boolean): boolean {
  return kkEnabled && isKkReady();
}

/** Простой доступ по точечному ключу с откатом на русский. */
export function translate(key: string, locale: Locale = 'ru'): string {
  const read = (dict: Dict): string | undefined => {
    const parts = key.split('.');
    let node: unknown = dict;
    for (const part of parts) {
      if (!node || typeof node !== 'object') return undefined;
      node = (node as Dict)[part];
    }
    return typeof node === 'string' && node.trim() !== '' ? node : undefined;
  };

  return read(DICTIONARIES[locale]) ?? read(DICTIONARIES.ru) ?? key;
}
