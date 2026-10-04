#!/usr/bin/env node
/**
 * Дымовые проверки работающего сайта (master prompt §18).
 *
 *   npm run build && npm start          # в одном терминале
 *   node scripts/smoke.mjs              # в другом
 *
 * Проверяет именно то, что нельзя проверить юнит-тестами: что страницы
 * открываются, заявка реально доходит до базы, повторная отправка не создаёт
 * дубль, неверные данные отклоняются, а в режиме без прайса в ответе нет ни
 * одной суммы.
 *
 * Сайт, который не отвечает, — это провал, а не «предупреждение», поэтому
 * скрипт завершается с кодом 1.
 */

import { randomUUID } from 'node:crypto';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const ORIGIN = BASE;

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

async function get(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    redirect: 'manual',
    ...options,
  });
  return response;
}

/** Уникальный «посетитель» на каждый сценарий — чтобы не упираться в лимит по IP. */
function uniqueIp(tag) {
  const n = Math.floor(Math.random() * 250) + 1;
  return `198.51.${tag}${Math.floor(Math.random() * 9)}.${n}`;
}

async function postJson(path, body, ip) {
  return get(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-forwarded-for': ip ?? uniqueIp(1),
    },
    body: JSON.stringify(body),
  });
}

async function waitForServer(attempts = 40) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(BASE, { redirect: 'manual' });
      if (response.status > 0) return true;
    } catch {
      // сервер ещё поднимается
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

/** Тело заявки, как его отправляет форма: только то, что видит клиент. */
function leadBody(overrides = {}) {
  return {
    formType: 'quick',
    name: 'Тестовая заявка',
    phone: '+7 701 000 11 22',
    productType: 'okno-pvh',
    consent: true,
    submissionId: randomUUID(),
    elapsedMs: 9000,
    honeypot: '',
    src: '2gis',
    ...overrides,
  };
}

console.log(`\nДымовые проверки: ${BASE}\n`);

if (!(await waitForServer())) {
  console.error(`Сайт не отвечает на ${BASE}. Запустите npm start в другом терминале.`);
  process.exit(1);
}

// ------------------------------------------------------------------ страницы

console.log('Публичные страницы');
const pages = [
  '/',
  '/okna-pvh',
  '/aluminievye-okna',
  '/vitrazhi-fasady',
  '/vhodnye-dveri',
  '/peregorodki',
  '/balkony',
  '/raschet',
  '/zamer',
  '/raboty',
  '/otzyvy',
  '/o-kompanii',
  '/dlya-biznesa',
  '/kontakty',
  '/faq',
  '/politika',
];
for (const page of pages) {
  const response = await get(page);
  check(`GET ${page} → 200`, response.status === 200, `получено ${response.status}`);
}

console.log('\nСлужебные файлы и защита');
{
  const sitemap = await get('/sitemap.xml');
  const body = await sitemap.text();
  check('sitemap.xml содержит главную', sitemap.status === 200 && body.includes('<urlset'));

  const robots = await get('/robots.txt');
  const robotsBody = await robots.text();
  check('robots.txt закрывает админку', robotsBody.includes('/admin'));
}

{
  const admin = await get('/admin');
  check(
    'Без сессии /admin уводит на вход',
    admin.status === 307 || admin.status === 302 || admin.status === 303,
    `получено ${admin.status}`,
  );

  const exportRoute = await get('/api/admin/export');
  check('Экспорт CSV недоступен без входа', exportRoute.status === 401, `получено ${exportRoute.status}`);

  const qrRoute = await get('/api/admin/qr?data=test');
  check('Генератор QR недоступен без входа', qrRoute.status === 401, `получено ${qrRoute.status}`);

  const cron = await get('/api/cron/notifications', { method: 'POST' });
  check('Cron защищён секретом', cron.status === 401, `получено ${cron.status}`);
}

// ------------------------------------------------------------------- заявки

console.log('\nПоток заявки');

// Случайный, но правдоподобный номер: 70[0-8] — реальные диапазоны KZ.
// Иначе проверка упадёт на валидации, а не на бизнес-логике.
const uniquePhone = `+770${Math.floor(Math.random() * 9)}${Math.floor(1000000 + Math.random() * 8999999)}`;
const visitorIp = uniqueIp(1);

// Одна и та же полезная нагрузка отправляется дважды: так проверяется
// идемпотентность (двойной клик), а не дедупликация по телефону.
const payload = leadBody({ phone: uniquePhone });
const first = await postJson('/api/leads', payload, visitorIp);
const firstBody = await first.json().catch(() => ({}));
check('Новая заявка создаётся', first.status === 200 && firstBody.ok === true, JSON.stringify(firstBody).slice(0, 200));
check('В ответе есть номер заявки', Number(firstBody.leadId) > 0);
check(
  'В режиме без прайса в ответе нет сумм',
  firstBody.price?.mode === 'off' && !/\d{3,}/.test(JSON.stringify(firstBody.price)),
  JSON.stringify(firstBody.price),
);
check('Есть готовая ссылка на WhatsApp', String(firstBody.whatsappHref || '').startsWith('https://wa.me/'));

// Идемпотентность: та же отправка (двойной клик, обновление страницы)
const second = await postJson('/api/leads', payload, visitorIp);
const secondBody = await second.json().catch(() => ({}));
check(
  'Повторная отправка той же формы не создаёт дубль',
  secondBody.leadId === firstBody.leadId && secondBody.idempotent === true,
  JSON.stringify(secondBody).slice(0, 200),
);

// Дедупликация по телефону за 24 часа — новый submissionId, тот же телефон
const duplicate = await postJson(
  '/api/leads',
  leadBody({ phone: uniquePhone, name: 'Тот же клиент' }),
  visitorIp,
);
const duplicateBody = await duplicate.json().catch(() => ({}));
check(
  'Повторное обращение по тому же телефону прикрепляется к заявке',
  duplicateBody.duplicate === true && duplicateBody.leadId === firstBody.leadId,
  JSON.stringify(duplicateBody).slice(0, 200),
);

// Валидация
console.log('\nВалидация и защита форм');
{
  const bad = await postJson('/api/leads', leadBody({ phone: '12345' }), uniqueIp(2));
  check('Неверный телефон отклоняется', bad.status === 422, `получено ${bad.status}`);
}

{
  const noConsent = await postJson('/api/leads', leadBody({ consent: false }), uniqueIp(2));
  const body = await noConsent.json().catch(() => ({}));
  check(
    'Без согласия на обработку данных заявка не создаётся',
    noConsent.status === 422 && String(body.error?.message || '').includes('соглас'),
    JSON.stringify(body).slice(0, 200),
  );
}

{
  const bot = await postJson(
    '/api/leads',
    leadBody({ honeypot: 'spam', elapsedMs: 100 }),
    uniqueIp(2),
  );
  const body = await bot.json().catch(() => ({}));
  check('Бот с заполненным honeypot не создаёт заявку', body.leadId === 0, JSON.stringify(body).slice(0, 200));
}

{
  // Ограничитель частоты: 8 заявок за 10 минут с одного адреса (§8.1, шаг 2).
  const floodIp = uniqueIp(3);
  const statuses = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await postJson('/api/leads', leadBody(), floodIp);
    statuses.push(response.status);
  }
  check(
    'Ограничитель частоты отсекает поток заявок с одного адреса',
    statuses.includes(429),
    `статусы: ${statuses.join(', ')}`,
  );
}

{
  const foreign = await fetch(`${BASE}/api/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify(leadBody()),
  });
  check('Запрос с чужого сайта отклоняется', foreign.status === 403, `получено ${foreign.status}`);
}

// ------------------------------------------------------------------- замеры

console.log('\nЗапись на замер');
{
  const availability = await get('/api/measurements/availability');
  const body = await availability.json().catch(() => ({ slots: [] }));
  check('Свободные слоты отдаются', availability.status === 200 && Array.isArray(body.slots));
  check('Слоты содержат время и признак доступности', body.slots?.length === 0 || 'startsAt' in body.slots[0]);
}

// ------------------------------------------------------------------ события

console.log('\nАналитика');
{
  const events = await postJson('/api/events', {
    events: [{ name: 'smoke_test', path: '/', sessionId: 'smoke', props: { source: 'script' } }],
  });
  check('События принимаются', events.status === 200, `получено ${events.status}`);
}

// -------------------------------------------------------------------- вывод

console.log(`\nРезультат: ${passed} успешно, ${failed} ошибок.\n`);

if (failed > 0) {
  console.log('Проверьте журнал сервера и docs/QA.md.');
  process.exit(1);
}

console.log('Все проверки пройдены.');
