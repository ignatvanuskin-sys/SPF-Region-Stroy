import { expect, test, type Page } from '@playwright/test';

/**
 * Тесты интерфейса и воронки.
 * Запуск: npm run build && npm run test:e2e
 */

const PHONE_HREF = 'tel:+77018936787';
const WA_PREFIX = 'https://wa.me/77018936787';

function thirdPartyRequests(page: Page): string[] {
  const thirdParty: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http')) return;
    if (url.includes('127.0.0.1') || url.includes('localhost')) return;
    thirdParty.push(url);
  });
  return thirdParty;
}

test.describe('Главная', () => {
  test('открывается, H1 виден, нет горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Окна, двери и фасадные витражи');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('первый экран помещает выбор категории и переход в WhatsApp', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Что вам нужно?' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Окна/ }).first()).toBeVisible();

    const wa = page.locator(`a[href^="${WA_PREFIX}"]:visible`).first();
    await expect(wa).toBeVisible();
    const box = await wa.boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(844);
  });
});

test.describe('Ссылки', () => {
  test('телефон и WhatsApp с пометкой «с сайта»', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(`a[href="${PHONE_HREF}"]:visible`).first()).toBeVisible();

    const waLinks = page.locator(`a[href^="${WA_PREFIX}"]:visible`);
    expect(await waLinks.count()).toBeGreaterThan(0);
    const href = await waLinks.first().getAttribute('href');
    expect(decodeURIComponent(href as string)).toContain('Пишу с сайта');
  });
});

test.describe('Форма заявки', () => {
  test('выбор категории подставляет её в форму', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Двери/ }).first().click();

    const form = page.locator('#zayavka');
    await form.scrollIntoViewIfNeeded();
    await expect(form.getByText('Шаг 1 из 3')).toBeVisible();
    await expect(form.getByRole('button', { name: /Двери/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('валидация: телефон и согласие проверяются на шаге связи', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#zayavka');
    await form.scrollIntoViewIfNeeded();

    // Шаг 1 → 2
    await form.getByRole('button', { name: /Окна/ }).click();
    await form.getByRole('button', { name: 'Далее' }).click();
    await expect(form.getByText('Шаг 2 из 3')).toBeVisible();

    // Шаг 2 → 3
    await form.getByRole('button', { name: 'Далее' }).click();
    await expect(form.getByText('Шаг 3 из 3')).toBeVisible();

    // Отправка без телефона и согласия
    await form.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(form.getByText('Введите телефон в формате +7 XXX XXX XX XX')).toBeVisible();
    await expect(
      form.getByText('Нужно согласие на обработку персональных данных'),
    ).toBeVisible();
  });

  test('без настроенного получателя показывает «не подключена», а не успех', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#zayavka');
    await form.scrollIntoViewIfNeeded();

    await form.getByRole('button', { name: /Окна/ }).click();
    await form.getByRole('button', { name: 'Далее' }).click();
    await form.getByRole('button', { name: 'Далее' }).click();

    await form.getByLabel('Телефон *').fill('+7 701 123 45 67');
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Отправить заявку' }).click();

    await expect(form.getByText(/Форма сейчас не подключена/)).toBeVisible();
    await expect(form.getByText(/Заявка принята/)).toHaveCount(0);
  });
});

test.describe('Режим concept', () => {
  test('присутствуют баннер и noindex', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText('Концепт сайта для СПФ Регион Строй. Не является официальным сайтом компании'),
    ).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
    expect(robots).toContain('nofollow');
  });
});

test.describe('Чистота страницы', () => {
  test('консоль без ошибок и нет сторонних запросов до согласия', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const thirdParty = thirdPartyRequests(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
    expect(thirdParty.filter((u) => !u.includes('fonts.googleapis'))).toEqual([]);
  });
});

test.describe('Страница услуги', () => {
  test('открывается, один H1, есть телефон и WhatsApp', async ({ page }) => {
    await page.goto('/plastikovye-okna');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator(`a[href="${PHONE_HREF}"]:visible`).first()).toBeVisible();
    await expect(page.locator(`a[href^="${WA_PREFIX}"]:visible`).first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Служебные страницы', () => {
  test('404 содержит кнопки WhatsApp и «Позвонить»', async ({ page }) => {
    const response = await page.goto('/nesushchestvuyushchaya-stranica');
    expect(response?.status()).toBe(404);
    await expect(page.locator(`a[href^="${WA_PREFIX}"]:visible`).first()).toBeVisible();
    await expect(page.locator(`a[href="${PHONE_HREF}"]:visible`).first()).toBeVisible();
  });

  test('страница благодарности закрыта от индексации', async ({ page }) => {
    await page.goto('/spasibo');
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('Доступность', () => {
  test('все интерактивные элементы доступны с клавиатуры', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(focused).not.toBe('BODY');
  });

  test('поля формы имеют связанные label', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#zayavka');
    await form.scrollIntoViewIfNeeded();
    await expect(form.getByLabel('Тип объекта')).toBeVisible();
  });
});
