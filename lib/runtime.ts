/**
 * Определение среды исполнения.
 *
 * Вынесено в отдельный модуль, чтобы и хранилище данных, и файловое хранилище
 * решали вопрос «куда писать» одинаково, не завися друг от друга.
 *
 * Зачем это вообще нужно: на Vercel, AWS Lambda и Netlify рабочий каталог
 * доступен только для чтения, и попытка писать в `./data` валит запрос.
 * Локальный запуск к этому отношения не имеет — там `./data` работает как надо.
 */

import os from 'node:os';
import path from 'node:path';

/** Признак платформы, где файловая система эфемерная или только для чтения. */
export function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY ||
      process.env.RENDER,
  );
}

/**
 * Временный каталог для serverless-режима или `null`, если можно писать рядом
 * с проектом. Явно заданный DATA_DIR всегда имеет приоритет.
 */
export function serverlessTempDir(): string | null {
  if (process.env.DATA_DIR) return null;
  return isServerless() ? path.join(os.tmpdir(), 'spf-region-stroy') : null;
}

/** Рабочий каталог для данных: DATA_DIR → tmp на serverless → ./data. */
export function dataRoot(): string {
  return process.env.DATA_DIR || serverlessTempDir() || path.join(process.cwd(), 'data');
}

/**
 * Данные лежат на временном диске и исчезнут после перезапуска инстанса.
 * Признак показывается владельцу в админке — он должен знать, что настройки
 * и заявки не сохранятся, пока не подключена база.
 */
export function isEphemeralStorage(): boolean {
  return serverlessTempDir() !== null;
}
