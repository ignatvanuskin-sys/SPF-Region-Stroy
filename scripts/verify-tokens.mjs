#!/usr/bin/env node
/**
 * scripts/verify-tokens.mjs — проверка дизайн-токенов.
 *
 * 1. HSL-значения из app/globals.css должны соответствовать эталонной палитре
 *    (design-system/spf-region-stroy/MASTER.md) с допуском ±3 на канал:
 *    токены заданы в HSL, поэтому обратное преобразование даёт округление.
 *    Допуск ловит реальные ошибки, но не шум округления.
 * 2. Все пары «текст на фоне» должны проходить WCAG AA (>= 4.5:1).
 *
 * Запуск: node scripts/verify-tokens.mjs
 */

import { readFileSync } from 'node:fs';

const CSS = readFileSync('app/globals.css', 'utf8');

/** Допустимое расхождение на канал между HSL и эталонным hex. */
const CHANNEL_TOLERANCE = 3;

/* ── 1. Ожидаемые значения ───────────────────────────────────── */

const EXPECTED = {
  background: '#FFFFFF',
  foreground: '#0B1B33',
  card: '#FFFFFF',
  'card-foreground': '#0B1B33',
  popover: '#FFFFFF',
  'popover-foreground': '#0B1B33',
  primary: '#1E40AF',
  'primary-foreground': '#FFFFFF',
  secondary: '#EFF6FF',
  'secondary-foreground': '#1E3A8A',
  muted: '#F1F5F9',
  'muted-foreground': '#475569',
  accent: '#EA580C',
  'accent-foreground': '#0B1B33',
  destructive: '#DC2626',
  'destructive-foreground': '#FFFFFF',
  border: '#DCE6F5',
  input: '#DCE6F5',
  ring: '#1E40AF',
  wa: '#0F7B4F',
  'wa-foreground': '#FFFFFF',
  success: '#067647',
  'success-foreground': '#FFFFFF',
  marker: '#FFF4CC',
  'marker-foreground': '#5C4400',
};

/* ── 2. Утилиты цвета ────────────────────────────────────────── */

function parseHsl(value) {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

function hslToHex({ h, s, l }) {
  const S = s / 100;
  const L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (n) =>
    Math.round(255 * f(n))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${to(0)}${to(8)}${to(4)}`;
}

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/* ── 3. Читаем токены из CSS ─────────────────────────────────── */

const declared = {};
// Формат значения в CSS: "<hue> <saturation>% <lightness>%" — процент только у S и L.
for (const [, name, h, s, l] of CSS.matchAll(/--([a-z-]+):\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%;/g)) {
  declared[name] = `${h} ${s}% ${l}%`;
}

let problems = 0;

console.log('\n[verify-tokens] 1. HSL в globals.css ↔ эталонная палитра (±3 на канал)\n');
for (const [name, expectedHex] of Object.entries(EXPECTED)) {
  const raw = declared[name];
  if (!raw) {
    console.log(`  FAIL --${name.padEnd(24)} не найден в globals.css`);
    problems += 1;
    continue;
  }
  const hex = hslToHex(parseHsl(raw));
  const [a, b] = [hexToRgb(hex), hexToRgb(expectedHex)];
  const delta = Math.max(...[0, 1, 2].map((i) => Math.abs(a[i] - b[i])));
  const ok = delta <= CHANNEL_TOLERANCE;
  if (!ok) problems += 1;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} --${name.padEnd(24)} ${raw.padEnd(16)} → ${hex}` +
      (ok ? `  (Δ${delta})` : `  ожидалось ${expectedHex} (Δ${delta})`),
  );
}

/* ── 4. Пары «текст на фоне» ─────────────────────────────────── */

const PAIRS = [
  ['foreground', 'background', 'основной текст'],
  ['muted-foreground', 'background', 'вторичный текст'],
  ['muted-foreground', 'muted', 'вторичный текст на muted'],
  ['muted-foreground', 'secondary', 'вторичный текст на secondary'],
  ['primary-foreground', 'primary', 'текст на primary-кнопке'],
  ['secondary-foreground', 'secondary', 'текст на secondary'],
  ['accent-foreground', 'accent', 'текст на акценте'],
  ['destructive-foreground', 'destructive', 'текст на ошибке'],
  ['wa-foreground', 'wa', 'текст на WhatsApp-кнопке'],
  ['success-foreground', 'success', 'текст на успехе'],
  ['marker-foreground', 'marker', 'текст маркера'],
  ['primary', 'background', 'ссылка primary на фоне'],
];

console.log('\n[verify-tokens] 2. Контраст пар (WCAG AA, минимум 4.5:1)\n');
for (const [fg, bg, label] of PAIRS) {
  const a = hslToHex(parseHsl(declared[fg]));
  const b = hslToHex(parseHsl(declared[bg]));
  const ratio = contrast(a, b);
  const ok = ratio >= 4.5;
  if (!ok) problems += 1;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(28)} ${ratio.toFixed(2)}:1   ${fg} на ${bg}`,
  );
}

console.log('');
if (problems > 0) {
  console.error(`[verify-tokens] проблем: ${problems}\n`);
  process.exit(1);
}
console.log('[verify-tokens] все токены совпадают, контраст в норме\n');
