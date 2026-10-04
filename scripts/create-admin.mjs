#!/usr/bin/env node
/**
 * Создание владельца админки.
 *
 *   npm run admin:create
 *
 * Берёт ADMIN_BOOTSTRAP_EMAIL и ADMIN_BOOTSTRAP_PASSWORD из переменных окружения.
 * Если пользователь с таким e-mail уже есть, пароль обновляется — это удобно,
 * если пароль забыт. Пароль хранится только в виде bcrypt-хеша.
 *
 * Для локального режима (без PostgreSQL) администратор создаётся в JSON-файле,
 * чтобы можно было проверить систему сразу после `npm run dev`.
 */

import { randomBytes, scryptSync } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';

if (!email || !password) {
  console.error('Задайте ADMIN_BOOTSTRAP_EMAIL и ADMIN_BOOTSTRAP_PASSWORD.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Пароль должен быть не короче 10 символов — им защищён доступ к данным клиентов.');
  process.exit(1);
}

/**
 * bcrypt-совместимый хеш без нативной зависимости: соль + scrypt.
 * Основное приложение использует bcryptjs, поэтому здесь берём ту же библиотеку,
 * чтобы формат хеша совпадал.
 */
async function hashPassword(plain) {
  const bcrypt = (await import('bcryptjs')).default;
  return bcrypt.hash(plain, 12);
}

async function seedPostgres(connectionString) {
  const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
  const client = new pg.Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const hash = await hashPassword(password);
  const result = await client.query(
    `insert into users (email, password_hash, role, name, must_change_password)
     values ($1, $2, 'owner', $3, false)
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'owner'
     returning id`,
    [email, hash, 'Владелец'],
  );

  await client.end();
  return result.rows[0]?.id;
}

async function seedJsonStore() {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const file = path.join(dataDir, 'store.json');

  let db = {
    leads: [],
    lead_events: [],
    lead_files: [],
    measurements: [],
    measurement_rules: null,
    blackout_dates: [],
    gallery_items: [],
    reviews_curated: [],
    claims: [],
    staff: [],
    users: [],
    notifications: [],
    settings: {},
    events: [],
    sequences: {},
  };

  try {
    db = { ...db, ...JSON.parse(await fs.readFile(file, 'utf8')) };
  } catch {
    // файла ещё нет — начинаем с пустой структуры
  }

  const hash = await hashPassword(password);
  const existing = db.users.findIndex((user) => user.email.toLowerCase() === email);
  const nextId = (db.sequences.users || 0) + 1;
  db.sequences.users = nextId;

  const record = {
    id: existing >= 0 ? db.users[existing].id : nextId,
    email,
    password_hash: hash,
    role: 'owner',
    name: 'Владелец',
    must_change_password: false,
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  if (existing >= 0) db.users[existing] = record;
  else db.users.push(record);

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(db, null, 2), 'utf8');
  return record.id;
}

try {
  const id = process.env.DATABASE_URL
    ? await seedPostgres(process.env.DATABASE_URL)
    : await seedJsonStore();

  console.log(`Владелец создан: ${email} (id: ${id}).`);
  console.log('Войдите в /admin/login и при желании смените пароль.');
} catch (error) {
  console.error('Не удалось создать администратора:', error.message);
  process.exitCode = 1;
}
