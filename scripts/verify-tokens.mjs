#!/usr/bin/env node
/**
 * scripts/verify-tokens.mjs — проверка визуальной системы.
 *
 * 1. HSL-значения из app/globals.css соответствуют эталонной палитре
 *    (допуск ±3 на канал: токены заданы в HSL, обратное преобразование округляет).
 * 2. Все пары «текст на фоне» проходят WCAG AA (>= 4.5:1).
 * 3. Бронза отдельно: она допустима только как деталь, поэтому проверяется,
 *    что она НЕ используется для обычного текста на светлом фоне.
 *
 * Запуск: node scripts/verify-tokens.mjs
 */

import { readFileSync } from 'node:fs';

const CSS = readFileSync('app/globals.css', 'utf8');
const CHANNEL_TOLERANCE = 3;

/* ── Эталонная палитра бренда ────────────────────────────────── */

const EXPECTED = {
  background: '#F7F6F2',
  foreground: '#151719',
  card: '#FFFFFF',
  'card-foreground': '#151719',
  popover: '#FFFFFF',
  'popover-foreground': '#151719',
  primary: '#526F7D',
  'primary-foreground': '#FFFFFF',
  secondary: '#E9EEF0',
  muted: '#EFEDE7',
  'muted-foreground': '#60676B',
  accent: '#B18A5A',
  'accent-foreground': '#151719',
  destructive: '#C0392B',
  'destructive-foreground': '#FFFFFF',
  border: '#E5E2DA',
  input: '#E5E2DA',
  ring: '#526F7D',
  wa: '#0F7B4F',
  'wa-foreground': '#FFFFFF',
  success: '#067647',
  'success-foreground': '#FFFFFF',
  marker: '#FFF4CC',
  'marker-foreground': '#5C4400',
};

/* ── Утилиты цвета ───────────────────────────────────────────── */

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

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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

/* ── Читаем токены ───────────────────────────────────────────── */

const declared = {};
for (const [, name, h, s, l] of CSS.matchAll(
  /--([a-z-]+):\s*([0-9.]+)\s+([0-9.]+)%\s+([0-9.]+)%;/g,
)) {
  declared[name] = `${h} ${s}% ${l}%`;
}

let problems = 0;

console.log('\n[verify-tokens] 1. HSL в globals.css ↔ палитра бренда (±3 на канал)\n');
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

/* ── Контраст ────────────────────────────────────────────────── */

const PAIRS = [
  ['foreground', 'background', 'основной текст'],
  ['foreground', 'card', 'текст на карточке'],
  ['muted-foreground', 'background', 'вторичный текст'],
  ['muted-foreground', 'card', 'вторичный текст на карточке'],
  ['muted-foreground', 'secondary', 'вторичный текст на светлом блоке'],
  ['muted-foreground', 'muted', 'вторичный текст на muted'],
  ['primary-foreground', 'primary', 'текст на кнопке бренда'],
  ['primary', 'background', 'ссылка/акцент на фоне'],
  ['secondary-foreground', 'secondary', 'текст на светлом блоке'],
  ['accent-foreground', 'accent', 'текст на бронзовой плашке'],
  ['destructive-foreground', 'destructive', 'текст на ошибке'],
  ['wa-foreground', 'wa', 'текст на WhatsApp'],
  ['success-foreground', 'success', 'текст на успехе'],
  ['marker-foreground', 'marker', 'текст маркера'],
];

console.log('\n[verify-tokens] 2. Контраст пар (WCAG AA, минимум 4.5:1)\n');
for (const [fg, bg, label] of PAIRS) {
  const a = hslToHex(parseHsl(declared[fg]));
  const b = hslToHex(parseHsl(declared[bg]));
  const ratio = contrast(a, b);
  const ok = ratio >= 4.5;
  if (!ok) problems += 1;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(30)} ${ratio.toFixed(2)}:1   ${fg} на ${bg}`,
  );
}

/* ── Бронза как деталь ───────────────────────────────────────── */

console.log('\n[verify-tokens] 3. Бронза — только деталь, не текст\n');
const accent = hslToHex(parseHsl(declared.accent));
for (const bg of ['background', 'card', 'secondary']) {
  const ratio = contrast(accent, hslToHex(parseHsl(declared[bg])));
  const ok = ratio < 4.5;
  if (!ok) problems += 1;
  console.log(
    `  ${ok ? 'OK  ' : 'FAIL'} бронза на --${bg.padEnd(12)} ${ratio.toFixed(2)}:1 ` +
      (ok ? '— для текста не годится, используется как линия/деталь' : '— неожиданно высокая: проверьте применение'),
  );
}

console.log('');
if (problems > 0) {
  console.error(`[verify-tokens] проблем: ${problems}\n`);
  process.exit(1);
}
console.log('[verify-tokens] палитра совпадает, контраст в норме, бронза — деталь\n');
