#!/usr/bin/env node
/**
 * Применение схемы к PostgreSQL.
 *
 *   npm run db:migrate
 *
 * Скрипт идемпотентный: все объекты создаются с IF NOT EXISTS, поэтому его можно
 * запускать повторно и после обновления схемы. Пишем на чистом JavaScript —
 * скриптам не нужны ни сборка, ни транспиляция.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, '..', 'lib', 'db', 'schema.sql');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Ошибка: не задан DATABASE_URL. Скопируйте .env.example в .env и заполните его.');
  process.exit(1);
}

const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
const client = new pg.Client({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

try {
  const sql = await readFile(schemaPath, 'utf8');
  await client.connect();
  await client.query(sql);
  console.log('Схема применена. Таблицы и индексы на месте.');
} catch (error) {
  console.error('Не удалось применить схему:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
