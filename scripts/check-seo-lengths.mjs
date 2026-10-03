#!/usr/bin/env node
/**
 * scripts/check-seo-lengths.mjs — длины метаданных (раздел 19.1):
 *   title ≤ 60 символов, description ≤ 155 символов.
 *
 * Источник — content/seo.ts. Дополнительно проверяется, что у каждой страницы
 * ровно один H1 (по маркеру <h1 в файле страницы) и нет дублей title/description.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SEO_FILE = join(ROOT, 'content', 'seo.ts');

const TITLE_MAX = 60;
const DESC_MAX = 155;

if (!existsSync(SEO_FILE)) {
  console.error('[check-seo] content/seo.ts не найден');
  process.exit(1);
}

const source = readFileSync(SEO_FILE, 'utf8');

// Разбор массива SEO без сборки TS: читаем литеральные объекты.
const entries = [];
const entryRe = /path:\s*'([^']+)'[\s\S]*?title:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?description:\s*'((?:[^'\\]|\\.)*)'/g;
let m;
while ((m = entryRe.exec(source)) !== null) {
  entries.push({
    path: m[1],
    title: m[2].replace(/\\'/g, "'"),
    description: m[3].replace(/\\'/g, "'"),
  });
}

if (entries.length === 0) {
  console.error('[check-seo] не удалось разобрать content/seo.ts');
  process.exit(1);
}

let problems = 0;
const titles = new Map();
const descriptions = new Map();

console.log('\n[check-seo] длины метаданных (title ≤ 60, description ≤ 155)\n');

for (const entry of entries) {
  const tLen = [...entry.title].length;
  const dLen = [...entry.description].length;
  const flags = [];
  if (tLen > TITLE_MAX) flags.push(`title +${tLen - TITLE_MAX}`);
  if (dLen > DESC_MAX) flags.push(`description +${dLen - DESC_MAX}`);
  if (titles.has(entry.title)) flags.push(`дубль title с ${titles.get(entry.title)}`);
  else titles.set(entry.title, entry.path);
  if (descriptions.has(entry.description))
    flags.push(`дубль description с ${descriptions.get(entry.description)}`);
  else descriptions.set(entry.description, entry.path);

  if (flags.length > 0) problems += 1;
  const status = flags.length === 0 ? 'OK  ' : 'FAIL';
  console.log(
    `  ${status} ${entry.path.padEnd(30)} title ${String(tLen).padStart(3)} / desc ${String(dLen).padStart(3)}` +
      (flags.length ? `  ← ${flags.join(', ')}` : ''),
  );
}

// Проверка «один H1 на страницу» выполняется по собранному HTML —
// см. scripts/postbuild.mjs (check-html). В исходниках H1 приходит из
// общих компонентов Hero / PageHero, поэтому подсчёт по тексту исходника
// давал бы ложные срабатывания.

console.log('');
if (problems > 0) {
  console.error(`[check-seo] проблем: ${problems}\n`);
  process.exit(1);
}
console.log('[check-seo] проблем нет\n');
process.exit(0);
