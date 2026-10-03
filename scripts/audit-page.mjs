#!/usr/bin/env node
/**
 * scripts/audit-page.mjs — быстрый аудит отданной страницы.
 *
 * Проверяет то, что нельзя проверить статически по исходникам:
 *   - маркеры достоверности действительно отрендерились чипами (concept);
 *   - noindex/nofollow на месте;
 *   - canonical есть;
 *   - в JSON-LD нет aggregateRating / review / openingHours;
 *   - ссылки tel: и wa.me с пометкой «с сайта»;
 *   - второй номер WhatsApp (F06) НЕ публикуется;
 *   - ровно один H1.
 *
 * Запуск: node scripts/audit-page.mjs http://127.0.0.1:3100/
 */

const url = process.argv[2] || 'http://127.0.0.1:3100/';

const html = await fetch(url).then((r) => r.text());

const count = (re) => (html.match(re) ?? []).length;

const checks = [
  ['маркеры достоверности отрендерены чипами', count(/class="marker"/g), (n) => n > 0],
  ['noindex присутствует', count(/noindex/g), (n) => n > 0],
  ['canonical присутствует', count(/rel="canonical"/g), (n) => n === 1],
  ['JSON-LD LocalBusiness', count(/"@type":\["LocalBusiness"/g), (n) => n >= 1],
  ['aggregateRating в JSON-LD (должно быть 0)', count(/aggregateRating/g), (n) => n === 0],
  ['review в JSON-LD (должно быть 0)', count(/"review"/g), (n) => n === 0],
  ['openingHours в JSON-LD (должно быть 0)', count(/openingHours/g), (n) => n === 0],
  ['FAQPage-разметка (должно быть 0)', count(/FAQPage/g), (n) => n === 0],
  ['ссылки tel:+77018936787', count(/tel:\+77018936787/g), (n) => n > 0],
  ['ссылки wa.me/77018936787', count(/wa\.me\/77018936787/g), (n) => n > 0],
  ['пометка «с сайта» в WhatsApp', count(/%D1%81%20%D1%81%D0%B0%D0%B9%D1%82%D0%B0/g), (n) => n > 0],
  ['второй номер WhatsApp F06 (должно быть 0)', count(/77011776090/g), (n) => n === 0],
  ['ровно один H1', count(/<h1\b/g), (n) => n === 1],
  ['график работы не опубликован', count(/09:00|понедельник/g), (n) => n === 0],
];

let failed = 0;
console.log(`\n[audit] ${url}\n`);
for (const [label, value, ok] of checks) {
  const pass = ok(value);
  if (!pass) failed += 1;
  console.log(`  ${pass ? 'OK  ' : 'FAIL'} ${label.padEnd(46)} ${value}`);
}

console.log('');
if (failed > 0) {
  console.error(`[audit] провалено проверок: ${failed}\n`);
  process.exit(1);
}
console.log('[audit] все проверки пройдены\n');
