#!/usr/bin/env node
/**
 * scripts/screenshots.mjs — скриншоты для отчёта (раздел 26, п. 5).
 * Главная и одна страница услуги в 390×844 и 1440×900.
 *
 * Требует запущенного сервера: npm run start -- --port 3100
 * Запуск: node scripts/screenshots.mjs
 */

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3100';
const OUT = join(process.cwd(), 'screenshots');
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { name: 'home', path: '/' },
  { name: 'service-plastikovye-okna', path: '/plastikovye-okna' },
  { name: 'contacts', path: '/kontakty' },
];

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1440x900', width: 1440, height: 900 },
];

const browser = await chromium.launch();
const results = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    locale: 'ru-RU',
  });
  const page = await context.newPage();

  for (const target of TARGETS) {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle' });
    // Даём иллюстрациям и reveal-анимациям завершиться.
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const full = join(OUT, `${target.name}-${vp.name}-full.png`);
    const first = join(OUT, `${target.name}-${vp.name}-first-screen.png`);
    await page.screenshot({ path: full, fullPage: true });
    await page.screenshot({ path: first });
    results.push(full, first);
  }

  await context.close();
}

await browser.close();
console.log('Скриншоты сохранены:');
for (const file of results) console.log('  ' + file);
