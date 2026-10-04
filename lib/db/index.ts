/**
 * Выбор драйвера хранилища и singleton-соединение.
 *
 * DB_DRIVER=pg    → PostgreSQL (нужен DATABASE_URL)
 * DB_DRIVER=json  → локальный файл (по умолчанию, если DATABASE_URL не задан)
 *
 * Автовыбор нужен, чтобы репозиторий запускался одной командой: без базы сайт
 * и весь поток заявок всё равно работают. На проде достаточно выставить
 * DATABASE_URL — драйвер переключится сам.
 */

import { JsonStore } from './json-store';
import { PgStore } from './pg-store';
import type { Store } from './types';

export type { Store } from './types';
export * from './types';

declare global {
  // eslint-disable-next-line no-var
  var __spf_store__: Store | undefined;
}

function createStore(): Store {
  const explicit = (process.env.DB_DRIVER || '').toLowerCase();
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  if (explicit === 'pg' || (!explicit && hasDatabaseUrl)) {
    if (!hasDatabaseUrl) {
      throw new Error('DB_DRIVER=pg требует переменную окружения DATABASE_URL');
    }
    return new PgStore();
  }

  return new JsonStore();
}

export function getStore(): Store {
  if (!globalThis.__spf_store__) {
    globalThis.__spf_store__ = createStore();
    if (process.env.NODE_ENV !== 'production' || process.env.DB_DRIVER) {
      console.info(`[db] драйвер хранилища: ${globalThis.__spf_store__.driver}`);
    }
  }
  return globalThis.__spf_store__;
}

/** Для тестов: подменить хранилище вручную. */
export function setStore(store: Store | undefined): void {
  globalThis.__spf_store__ = store;
}
