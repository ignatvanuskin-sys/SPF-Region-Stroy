#!/usr/bin/env node
/**
 * scripts/vercel-open.mjs — снять Vercel Authentication (Deployment Protection)
 * с проекта, чтобы сайт открывался по ссылке без входа в Vercel.
 *
 * Запуск: node scripts/vercel-open.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TEAM_ID = 'team_shtN8XYm6NbFLU1fBpKwrCVf';
const PROJECT_ID = 'prj_v70VYuVc8mU31AvFPIUgrOaLWoZW';

const CANDIDATES = [
  join(process.env.APPDATA ?? '', 'com.vercel.cli', 'auth.json'),
  join(process.env.APPDATA ?? '', 'com.vercel.cli', 'Data', 'auth.json'),
  join(homedir(), '.local', 'share', 'com.vercel.cli', 'auth.json'),
  join(homedir(), '.vercel', 'auth.json'),
];

const authPath = CANDIDATES.find((p) => p && existsSync(p));
if (!authPath) {
  console.error('Не найден файл авторизации Vercel. Проверьте пути:');
  for (const p of CANDIDATES) console.error('  ' + p);
  process.exit(1);
}

const token = JSON.parse(readFileSync(authPath, 'utf8')).token;
if (!token) {
  console.error('В файле авторизации нет token');
  process.exit(1);
}
console.log('auth:      ' + authPath);

const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`;

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ssoProtection: null,
    passwordProtection: null,
  }),
});

const text = await res.text();
console.log('http:      ' + res.status);

if (!res.ok) {
  console.error(text.slice(0, 600));
  process.exit(1);
}

const data = JSON.parse(text);
console.log('project:   ' + data.name);
console.log('protection:' + JSON.stringify(data.ssoProtection ?? null));
console.log('password:  ' + JSON.stringify(data.passwordProtection ?? null));
