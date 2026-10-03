#!/usr/bin/env node
/**
 * scripts/prebuild.mjs — то, что запускается перед `next build`.
 *
 * В concept:  проверки выполняются в режиме отчёта, сборка продолжается.
 * В production: проверка маркеров падает (release gate), сборка останавливается.
 */

import { spawnSync } from 'node:child_process';

const MODE = process.env.SITE_MODE === 'production' ? 'production' : 'concept';

console.log(`\n═══ prebuild · SITE_MODE=${MODE} ═══\n`);

const steps = [
  { name: 'check-placeholders', file: 'scripts/check-placeholders.mjs' },
  { name: 'check-seo-lengths', file: 'scripts/check-seo-lengths.mjs' },
];

for (const step of steps) {
  const res = spawnSync(process.execPath, [step.file], {
    stdio: 'inherit',
    env: process.env,
  });
  if (res.status !== 0) {
    if (MODE === 'production') {
      console.error(`\n[prebuild] ${step.name} завершился с кодом ${res.status}. Сборка остановлена.\n`);
      process.exit(res.status ?? 1);
    }
    console.warn(`\n[prebuild] ${step.name} нашёл замечания — в concept это допустимо.\n`);
  }
}

console.log('═══ prebuild завершён ═══\n');
