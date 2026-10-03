#!/usr/bin/env node
/**
 * scripts/migrate-tokens.mjs — разовая миграция компонентов на токены shadcn.
 *
 * Старая палитра (--bg, --ink, --line, --accent-tint, …) заменена семантическими
 * токенами. Скрипт переписывает классы Tailwind в app/ и components/.
 *
 * Запуск: node scripts/migrate-tokens.mjs [--dry]
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const DRY = process.argv.includes('--dry');

const REPLACEMENTS = [
  // Фон
  ['bg-[color:var(--bg-alt)]', 'bg-muted'],
  ['bg-[color:var(--bg)]/95', 'bg-background/95'],
  ['bg-[color:var(--bg)]/90', 'bg-background/90'],
  ['bg-[color:var(--bg)]', 'bg-background'],
  // Текст
  ['text-[color:var(--ink-2)]', 'text-muted-foreground'],
  ['text-[color:var(--ink)]', 'text-foreground'],
  ['text-[color:var(--muted)]', 'text-muted-foreground'],
  ['text-[color:var(--accent)]', 'text-primary'],
  ['text-[color:var(--accent-hover)]', 'text-primary'],
  ['text-[color:var(--error)]', 'text-destructive'],
  ['text-[color:var(--success)]', 'text-success'],
  ['text-[color:var(--wa)]', 'text-wa'],
  ['text-[color:var(--marker-ink)]', 'text-marker-foreground'],
  // Границы
  ['border-[color:var(--line)]', 'border-border'],
  ['border-[color:var(--accent)]', 'border-primary'],
  ['border-[color:var(--error)]', 'border-destructive'],
  // Фон элементов
  ['bg-[color:var(--accent-tint)]', 'bg-secondary'],
  ['bg-[color:var(--accent)]', 'bg-primary'],
  ['bg-[color:var(--marker-bg)]', 'bg-marker'],
  ['bg-[color:var(--wa)]', 'bg-wa'],
  // SVG-атрибуты (stroke/fill) — var() подставляем явно через hsl()
  ['var(--ink-2)', 'hsl(var(--muted-foreground))'],
  ['var(--ink)', 'hsl(var(--foreground))'],
  ['var(--accent)', 'hsl(var(--primary))'],
  ['var(--marker-ink)', 'hsl(var(--marker-foreground))'],
  // Hover
  ['hover:text-[color:var(--accent)]', 'hover:text-primary'],
  ['hover:border-[color:var(--accent)]', 'hover:border-primary'],
  ['hover:text-[color:var(--wa)]', 'hover:text-wa'],
];

const DIRS = ['app', 'components'];
const EXT = new Set(['.tsx', '.ts']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(extname(entry))) out.push(full);
  }
  return out;
}

let changedFiles = 0;
let changedCount = 0;

for (const dir of DIRS) {
  for (const file of walk(dir)) {
    const before = readFileSync(file, 'utf8');
    let after = before;
    let hits = 0;

    for (const [from, to] of REPLACEMENTS) {
      const parts = after.split(from);
      if (parts.length > 1) {
        hits += parts.length - 1;
        after = parts.join(to);
      }
    }

    if (after !== before) {
      changedFiles += 1;
      changedCount += hits;
      if (!DRY) writeFileSync(file, after, 'utf8');
      console.log(`  ${hits.toString().padStart(3)}  ${file}`);
    }
  }
}

console.log(
  `\n[migrate-tokens] ${DRY ? 'DRY RUN: ' : ''}файлов ${changedFiles}, замен ${changedCount}\n`,
);
