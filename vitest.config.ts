import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Тесты покрывают то, где ошибка стоит дорого и не видна глазом:
 * нормализацию телефонов, расчёт цены, генерацию слотов и переходы статусов.
 * Это чистые функции — их можно проверять без базы и без браузера.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Интеграционные тесты пишут в отдельный временный файл — не мешаем друг другу.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
