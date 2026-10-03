#!/usr/bin/env node
/**
 * scripts/postbuild.mjs — проверки по СОБРАННОМУ HTML.
 *
 * Проверяем то, что действительно уходит в браузер:
 *   1. ровно один <h1> на страницу;
 *   2. в concept — meta robots noindex,nofollow на каждой странице, кроме noindex-страниц;
 *   3. canonical присутствует;
 *   4. в JSON-LD нет aggregateRating, review и openingHours;
 *   5. нет мета-тегов и ссылок на маркеры (они не должны попадать в разметку);
 *   6. нет горизонтального «overflow-x: scroll» хуков — не проверяется статически,
 *      вынесено в Playwright;
 *   7. размер стартового JS на страницу（gzip） — информационно.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const MODE = process.env.SITE_MODE === 'production' ? 'production' : 'concept';
const APP = join(ROOT, '.next', 'server', 'app');

if (!existsSync(APP)) {
  console.error('[postbuild] Не найден каталог .next/server/app — сначала выполните next build.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'api' || entry === 'fonts' || entry === 'font-test') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (extname(entry) === '.html') out.push(full);
  }
  return out;
}

const htmlFiles = walk(APP);
const problems = [];

console.log(`\n[postbuild] SITE_MODE=${MODE} · HTML-страниц: ${htmlFiles.length}\n`);

for (const file of htmlFiles) {
  const rel = relative(APP, file).split('\\').join('/');
  const html = readFileSync(file, 'utf8');
  const issues = [];

  // 1. Один H1
  const h1 = (html.match(/<h1\b/g) ?? []).length;
  if (h1 !== 1) issues.push(`H1=${h1}`);

  // 2. noindex в concept
  const robotsMeta = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? '';
  const intentionallyNoindex = /spasibo/.test(rel);
  if (MODE === 'concept' && !intentionallyNoindex && !/noindex/.test(robotsMeta)) {
    issues.push('нет noindex в concept');
  }
  if (MODE === 'production' && /noindex/.test(robotsMeta) && !intentionallyNoindex) {
    issues.push('неожиданный noindex в production');
  }

  // 3. canonical
  if (!/<link rel="canonical"/.test(html)) issues.push('нет canonical');

  // 4. JSON-LD: запрещённые поля
  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  for (const [, body] of jsonLdBlocks) {
    if (/"aggregateRating"/.test(body)) issues.push('JSON-LD: aggregateRating');
    if (/"review"/.test(body)) issues.push('JSON-LD: review');
    if (/"openingHours/.test(body)) issues.push('JSON-LD: openingHours');
  }
  if (jsonLdBlocks.length === 0 && rel === 'index.html') issues.push('нет JSON-LD LocalBusiness');

  // 5. Маркеры не должны попадать в HTML как есть
  if (MODE === 'production') {
    for (const needle of ['[УТОЧНИТЬ', '[ПОДТВЕРДИТЬ', '[Добавить', '[Уточнить', 'TODO_CONTENT']) {
      if (html.includes(needle)) issues.push(`маркер в HTML: ${needle}`);
    }
  }

  const status = issues.length === 0 ? 'OK  ' : 'FAIL';
  if (issues.length > 0) problems.push({ rel, issues });
  console.log(`  ${status} ${rel.padEnd(34)} ${issues.join('; ')}`);
}

// 7. Стартовый JS на страницу (gzip) — информационно.
const chunksDir = join(ROOT, '.next', 'static', 'chunks');
if (existsSync(chunksDir)) {
  let total = 0;
  for (const entry of readdirSync(chunksDir)) {
    if (extname(entry) !== '.js') continue;
    const buf = readFileSync(join(chunksDir, entry));
    total += gzipSync(buf).length;
  }
  console.log(
    `\n[postbuild] Суммарный JS в .next/static/chunks (gzip): ${(total / 1024).toFixed(1)} КБ`,
  );
  console.log('[postbuild] Точный стартовый JS на страницу измеряет Lighthouse.');
}

console.log('');
if (problems.length > 0) {
  console.error(`[postbuild] проблем: ${problems.length}\n`);
  process.exit(1);
}
console.log('[postbuild] проблем нет\n');
process.exit(0);
