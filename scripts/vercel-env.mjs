#!/usr/bin/env node
/**
 * scripts/vercel-env.mjs — аккуратная установка переменных окружения Vercel.
 *
 * Зачем отдельный скрипт: `vercel env add` читает значение из stdin, и
 * PowerShell добавляет перевод строки. Значение с пробелом в конце Vercel
 * принимает, но потом валит деплой («contains leading or trailing whitespace»),
 * если переменная используется в HTTP-заголовке. Здесь значения задаются точно.
 *
 * Запуск:
 *   node scripts/vercel-env.mjs list
 *   node scripts/vercel-env.mjs rm CRON_SECRET
 *   node scripts/vercel-env.mjs set CRON_SECRET <значение>
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TEAM_ID = 'team_shtN8XYm6NbFLU1fBpKwrCVf';
const PROJECT_ID = 'prj_v70VYuVc8mU31AvFPIUgrOaLWoZW';
const API = 'https://api.vercel.com';

const CANDIDATES = [
  join(process.env.APPDATA ?? '', 'com.vercel.cli', 'Data', 'auth.json'),
  join(process.env.APPDATA ?? '', 'com.vercel.cli', 'auth.json'),
  join(homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
];
const authPath = CANDIDATES.find((p) => p && existsSync(p));
if (!authPath) {
  console.error('Файл авторизации Vercel не найден');
  process.exit(1);
}
const token = JSON.parse(readFileSync(authPath, 'utf8')).token;

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const [action, key, value] = process.argv.slice(2);

async function list() {
  const res = await fetch(`${API}/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&decrypt=true`, {
    headers,
  });
  const data = await res.json();
  for (const item of data.envs ?? []) {
    const raw = String(item.value ?? '');
    const dirty = raw !== raw.trim();
    console.log(
      `  ${item.key.padEnd(28)} ${(item.target ?? []).join(',').padEnd(12)} ` +
        `len=${raw.length}${dirty ? '  ⚠ пробелы по краям' : ''}`,
    );
  }
}

/**
 * Удаление по ключу: API удаляет переменную по её id, а не по имени,
 * поэтому сначала находим запись в списке.
 */
async function remove(name) {
  const listRes = await fetch(`${API}/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, { headers });
  const data = await listRes.json();
  const found = (data.envs ?? []).filter((e) => e.key === name);

  if (found.length === 0) {
    console.log(`rm ${name}: не найдено`);
    return;
  }

  for (const item of found) {
    const res = await fetch(
      `${API}/v9/projects/${PROJECT_ID}/env/${item.id}?teamId=${TEAM_ID}`,
      { method: 'DELETE', headers },
    );
    console.log(`rm ${name} (${item.id}): ${res.status}`);
  }
}

async function set(name, val) {
  if (val !== val.trim()) throw new Error('значение содержит пробелы по краям');
  if (!val) throw new Error('пустое значение');

  // Сначала удаляем прежнее, иначе API вернёт конфликт.
  await remove(name);

  const res = await fetch(`${API}/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      key: name,
      value: val,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    }),
  });

  const text = await res.text();
  console.log(`set ${name}: ${res.status}`);
  if (!res.ok) {
    console.error(text.slice(0, 400));
    process.exit(1);
  }
  console.log(`  значение длиной ${val.length}, пробелов по краям нет`);
}

if (action === 'list') await list();
else if (action === 'rm') await remove(key);
else if (action === 'set') await set(key, value);
else {
  console.error('Использование: node scripts/vercel-env.mjs list|rm <KEY>|set <KEY> <VALUE>');
  process.exit(1);
}
