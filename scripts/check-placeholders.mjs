#!/usr/bin/env node
/**
 * scripts/check-placeholders.mjs — release gate (раздел 2).
 *
 * Ищет по content/, messages/ и собранному HTML строки:
 *   [УТОЧНИТЬ  [ПОДТВЕРДИТЬ  [Добавить  [Уточнить  TODO_CONTENT
 *
 * SITE_MODE=production → выход с кодом 1 и списком найденного.
 * SITE_MODE=concept    → отчёт без падения (маркеры видны как жёлтые чипы).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const MODE = process.env.SITE_MODE === 'production' ? 'production' : 'concept';

const NEEDLES = ['[УТОЧНИТЬ', '[ПОДТВЕРДИТЬ', '[Добавить', '[Уточнить', 'TODO_CONTENT'];

const SCAN_DIRS = ['content', 'messages', 'app', 'components', 'lib'];
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.md', '.html', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'test-results', 'playwright-report']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

/** Разбор строк, которые сами содержат список маркеров (этот скрипт, docs, тесты). */
const SELF_REFERENTIAL = [
  'scripts/check-placeholders.mjs',
  'SPF_REGION_STROY_MASTER_PROMPT.md',
  'lib/markers.ts',
  'tests/',
  '.next/',
];

function isSelfReferential(rel) {
  const normalized = rel.split('\\').join('/');
  return SELF_REFERENTIAL.some((s) => normalized === s || normalized.startsWith(s));
}

const findings = [];
const seen = new Set();

for (const dir of [...SCAN_DIRS, '.next']) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file);
    if (isSelfReferential(rel)) continue;
    // В собранном HTML ищем только страницы и статические файлы.
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const needle of NEEDLES) {
        let idx = line.indexOf(needle);
        while (idx !== -1) {
          const snippet = line.slice(idx, idx + 90).replace(/\s+/g, ' ').trim();
          const key = `${rel}:${i + 1}:${snippet}`;
          if (!seen.has(key)) {
            seen.add(key);
            findings.push({ file: rel, line: i + 1, needle, snippet });
          }
          idx = line.indexOf(needle, idx + needle.length);
        }
      }
    });
  }
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

const total = findings.length;
console.log(`\n[check-placeholders] SITE_MODE=${MODE}`);
console.log(`[check-placeholders] наймarkerов: ${total} в ${byFile.size} файлах\n`);

for (const [file, items] of [...byFile.entries()].sort()) {
  console.log(`  ${file}`);
  for (const item of items) {
    console.log(`    ${String(item.line).padStart(4)}  ${item.snippet}`);
  }
}

if (total === 0) {
  console.log('Маркеров нет.\n');
}

if (MODE === 'production' && total > 0) {
  console.error(
    `\n[check-placeholders] СБОРКА ОСТАНОВЛЕНА: в production нельзя оставлять ни одного маркера.\n` +
      `Уточните перечисленные факты у компании и замените маркеры реальными данными.\n`,
  );
  process.exit(1);
}

process.exit(0);
