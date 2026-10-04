#!/usr/bin/env node
/**
 * Начальное наполнение: базовые настройки и правила записи на замер.
 *
 *   npm run db:seed
 *
 * Что НЕ делает этот скрипт и почему:
 *
 * Реестр утверждений (content/claims.ts) намеренно не копируется в базу. Он
 * остаётся единственным источником правды в коде: приложение само подставляет
 * значения оттуда, а в таблицу `claims` запись попадает только тогда, когда
 * владелец подтверждает утверждение в админке. Так не бывает ситуации, когда
 * в базе лежит устаревшая копия формулировки, а в коде — новая.
 *
 * Скрипт безопасно запускать повторно: существующие настройки он не
 * перезаписывает (`on conflict do nothing` / только отсутствующие ключи).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

/**
 * Настройки по умолчанию.
 * Цены выключены: пока владелец не дал прайс, ни одна сумма не показывается.
 */
const DEFAULT_SETTINGS = {
  price_display: 'off',
  kk_enabled: false,
  ai_enabled: false,
  order_status_page_enabled: false,
  sla: { firstResponseMinutes: 10, businessHoursOnly: true },
  rating: { value: 4.9, ratingsCount: 46, reviewsCount: 43, photosCount: 26, checkedAt: '2026-10-04' },
  // Текст графика пустой — на сайте будет «Режим работы уточняйте у менеджера»,
  // пока владелец не заполнит его в настройках.
  working_hours: { text: null, workdays: [1, 2, 3, 4, 5], startMinutes: 540, endMinutes: 1140 },
  phone_primary: '+77018936787',
};

const DEFAULT_RULES = {
  weekdays: [1, 2, 3, 4, 5],
  dayStartMinutes: 540,
  dayEndMinutes: 1140,
  slotMinutes: 60,
  capacityPerSlot: 2,
  minLeadHours: 12,
  horizonDays: 14,
  timezone: 'Asia/Almaty',
};

async function seedPostgres(connectionString) {
  const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
  const client = new pg.Client({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await client.query(
      `insert into settings (key, value) values ($1, $2) on conflict (key) do nothing`,
      [key, JSON.stringify(value)],
    );
  }

  await client.query(
    `insert into measurement_rules
       (id, weekdays, day_start_minutes, day_end_minutes, slot_minutes,
        capacity_per_slot, min_lead_hours, horizon_days, timezone)
     values (1, $1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`,
    [
      DEFAULT_RULES.weekdays,
      DEFAULT_RULES.dayStartMinutes,
      DEFAULT_RULES.dayEndMinutes,
      DEFAULT_RULES.slotMinutes,
      DEFAULT_RULES.capacityPerSlot,
      DEFAULT_RULES.minLeadHours,
      DEFAULT_RULES.horizonDays,
      DEFAULT_RULES.timezone,
    ],
  );

  await client.end();
  return Object.keys(DEFAULT_SETTINGS).length;
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
    // файла ещё нет — начнём с пустой структуры
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (db.settings[key] === undefined) db.settings[key] = value;
  }

  db.measurement_rules ??= { ...DEFAULT_RULES };

  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(db, null, 2), 'utf8');
  return Object.keys(DEFAULT_SETTINGS).length;
}

try {
  const count = process.env.DATABASE_URL
    ? await seedPostgres(process.env.DATABASE_URL)
    : await seedJsonStore();

  console.log(`Настройки загружены (${count} ключей). Правила записи на замер установлены.`);
  console.log('Утверждения берутся из content/claims.ts и обновляются в разделе «Утверждения».');
  console.log('Дальше: npm run admin:create — создать владельца админки.');
} catch (error) {
  console.error('Не удалось выполнить наполнение:', error.message);
  process.exitCode = 1;
}
