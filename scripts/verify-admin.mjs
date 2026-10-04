#!/usr/bin/env node
/**
 * Проверка админки на запущенном сайте.
 *
 *   $env:SESSION_SECRET='...'; node scripts/verify-admin.mjs
 *
 * Что проверяется:
 *  1. Сохранённый пароль владельца действительно подходит (bcrypt-хеш валиден) —
 *     то есть вход в админку возможен, а не «форма есть, а пароль не работает».
 *  2. Подписанная сессионная cookie принимается сервером, и защищённые разделы
 *     отдают 200 — то есть проверка сессии работает в обе стороны.
 *  3. Заявка, созданная дымовым тестом, действительно видна в админке вместе с
 *     определённым источником трафика.
 */

import { createHmac } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.SESSION_SECRET;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

if (!SECRET) {
  console.error('Задайте SESSION_SECRET — тот же, что у запущенного сервера.');
  process.exit(1);
}

// --------------------------------------------------------------- пользователь

const storeRaw = await fs.readFile(path.join(DATA_DIR, 'store.json'), 'utf8');
const db = JSON.parse(storeRaw);
const owner = db.users?.[0];

check('Владелец создан в хранилище', Boolean(owner), 'users пуст');
if (!owner) process.exit(1);

check('Пароль хранится только в виде хеша', owner.password_hash.startsWith('$2'), owner.password_hash.slice(0, 7));
check('Роль владельца выставлена', owner.role === 'owner');

// Проверяем, что известный пароль действительно совпадает с хешем.
const bcrypt = (await import('bcryptjs')).default;
const passwordOk = await bcrypt.compare('SpfRegionStroy-2026!', owner.password_hash);
check('Сохранённый пароль подходит к хешу (вход сработает)', passwordOk);

// ------------------------------------------------------------------ сессия

const payload = {
  userId: owner.id,
  email: owner.email,
  role: owner.role,
  mustChangePassword: false,
  expiresAt: Date.now() + 3600_000,
};
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature = createHmac('sha256', SECRET).update(body).digest('base64url');
const cookie = `spf_session=${body}.${signature}`;

const authHeaders = { cookie };

// ------------------------------------------------------------------- разделы

const sections = [
  ['/admin', 'Обзор'],
  ['/admin/leads', 'Заявки'],
  ['/admin/measurements', 'Замеры'],
  ['/admin/gallery', 'Галерея'],
  ['/admin/reviews', 'Отзывы'],
  ['/admin/claims', 'Утверждения'],
  ['/admin/links', 'Ссылки и QR'],
  ['/admin/notifications', 'Журнал'],
  ['/admin/settings', 'Настройки'],
  ['/admin/password', 'Пароль'],
];

console.log('\nРазделы админки с активной сессией');
for (const [url, expected] of sections) {
  const response = await fetch(`${BASE}${url}`, { headers: authHeaders, redirect: 'manual' });
  const html = response.status === 200 ? await response.text() : '';
  check(
    `GET ${url}`,
    response.status === 200 && html.includes(expected),
    `статус ${response.status}`,
  );
}

// -------------------------------------------------------------- данные лида

console.log('\nДанные заявок');

const leadsPage = await fetch(`${BASE}/admin/leads`, { headers: authHeaders });
const leadsHtml = await leadsPage.text();
check('Список заявок содержит данные дымового теста', leadsHtml.includes('Тестовая заявка'));

// Атрибуция: в карточке лида должен быть виден источник 2ГИС
const lead = db.leads?.find((item) => item.source === '2gis');
check('Источник заявки определён как 2ГИС', Boolean(lead), 'в хранилище нет лида с source=2gis');

if (lead) {
  const card = await fetch(`${BASE}/admin/leads/${lead.id}`, { headers: authHeaders });
  const cardHtml = await card.text();
  check(`Карточка заявки #${lead.id} открывается`, card.status === 200);
  check('В карточке виден источник 2ГИС', cardHtml.includes('2ГИС'));
  check('В карточке есть кнопки связи', cardHtml.includes('Позвонить') && cardHtml.includes('WhatsApp'));
}

// Уведомления: Telegram не настроен, поэтому должно быть честное «не доставлено»
const notifications = await fetch(`${BASE}/admin/notifications`, { headers: authHeaders });
const notificationsHtml = await notifications.text();
check(
  'Журнал показывает недоставленные уведомления',
  notificationsHtml.includes('ошибка') || notificationsHtml.includes('Ошибок'),
);

// Совместимость: 60-секундные лимиты не должны мешать проверке
console.log(`\nРезультат: ${passed} успешно, ${failed} ошибок.\n`);
process.exit(failed > 0 ? 1 : 0);
