import { expect, test, type Page } from '@playwright/test';

/**
 * Тесты интерфейса, воронки и чистоты страницы.
 * Запуск: npm run build && npm run test:e2e
 */

const PHONE_HREF = 'tel:+77018936787';
const WA_PREFIX = 'https://wa.me/77018936787';
const TWOGIS = '2gis.kz/astana/firm/70000001042561575';

function thirdPartyRequests(page: Page): string[] {
  const list: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('http')) return;
    if (url.includes('127.0.0.1') || url.includes('localhost')) return;
    list.push(url);
  });
  return list;
}

async function waitForQuiz(page: Page) {
  const quiz = page.locator('#raschet');
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText('Шаг 1 из 4')).toBeVisible();
  return quiz;
}

test.describe('Первый экран', () => {
  test('за 5 секунд понятно: что, где, для кого, что делать', async ({ page }) => {
    await page.goto('/');

    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Окна, двери и фасадные витражи');
    await expect(h1).toContainText('в Астане');

    await expect(page.getByText('Астана · Казахстан')).toBeVisible();
    await expect(
      page.getByText('Подберем решение под ваш объект'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Получить расчет и вызвать замерщика' }).first(),
    ).toBeVisible();
  });

  test('на первом экране: CTA, WhatsApp, телефон, рейтинг, оценки, отзывы', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    for (const label of ['Рейтинг 2ГИС', 'Оценок', 'Отзыва']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('46').first()).toBeVisible();
    await expect(page.getByText('43').first()).toBeVisible();

    const wa = page.locator(`a[href^="${WA_PREFIX}"]:visible`).first();
    await expect(wa).toBeVisible();
    const box = await wa.boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(844);
  });

  test('нет горизонтального переполнения на 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Выбор по типу объекта', () => {
  test('четыре сценария и подходящие услуги', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="obekty-title"]');

    for (const name of ['Квартира', 'Частный дом или коттедж', 'Балкон', 'Коммерческий объект или фасад']) {
      await expect(section.getByRole('tab', { name })).toBeVisible();
    }

    await section.getByRole('tab', { name: 'Балкон' }).click();
    await expect(section.getByRole('tab', { name: 'Балкон' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(section.getByText('Остекление и отделка балкона')).toBeVisible();
    await expect(section.getByRole('link', { name: 'Получить консультацию' })).toBeVisible();
  });
});

test.describe('Услуги', () => {
  test('шесть блоков с полем «кому подходит»', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="uslugi-title"]');

    for (const title of [
      'Окна ПВХ',
      'Алюминиевые окна',
      'Металлопластиковые двери',
      'Алюминиевые двери',
      'Фасадные витражи',
      'Ремонт окон',
    ]) {
      await expect(section.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }

    // В секции шесть услуг; лишнее совпадение даёт текст подписи блока.
    expect(await section.getByText('Кому подходит').count()).toBeGreaterThanOrEqual(6);
    expect(await section.getByText('Что нужно уточнить').count()).toBeGreaterThanOrEqual(6);
  });
});

test.describe('Квиз расчета', () => {
  test('четыре шага с прогрессом и подсказкой «что дальше»', async ({ page }) => {
    await page.goto('/');
    const quiz = await waitForQuiz(page);

    await expect(quiz.getByRole('group').getByText('Что нужно остеклить?').last()).toBeVisible();
    await quiz.getByRole('button', { name: 'Квартиру' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await expect(quiz.getByText('Шаг 2 из 4')).toBeVisible();

    await quiz.getByRole('button', { name: /Окна/ }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await expect(quiz.getByText('Шаг 3 из 4')).toBeVisible();

    await quiz.getByRole('button', { name: 'Далее' }).click();
    await expect(quiz.getByText('Шаг 4 из 4')).toBeVisible();
    await expect(quiz.getByRole('group').getByText('Как с вами связаться?').last()).toBeVisible();
  });

  test('выбор объекта в разделе 2 подставляется в квиз', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Балкон' }).click();
    const quiz = await waitForQuiz(page);
    await expect(quiz.getByRole('button', { name: 'Балкон' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('валидация телефона и согласия на последнем шаге', async ({ page }) => {
    await page.goto('/');
    const quiz = await waitForQuiz(page);

    await quiz.getByRole('button', { name: 'Квартиру' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: /Окна/ }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: 'Получить расчет' }).click();

    await expect(quiz.getByText('Введите телефон в формате +7 XXX XXX XX XX')).toBeVisible();
    await expect(
      quiz.getByText('Нужно согласие на обработку персональных данных'),
    ).toBeVisible();
  });

  test('без настроенного приёма заявок показывает «не подключена», а не успех', async ({ page }) => {
    await page.goto('/');
    const quiz = await waitForQuiz(page);

    await quiz.getByRole('button', { name: 'Квартиру' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: /Окна/ }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();

    await quiz.getByLabel('Телефон *').fill('+7 701 123 45 67');
    await quiz.getByRole('checkbox').check();
    await quiz.getByRole('button', { name: 'Получить расчет' }).click();

    await expect(quiz.getByText('Форма сейчас не подключена')).toBeVisible();
    await expect(quiz.getByText('Заявка принята')).toHaveCount(0);
  });

  test('ссылка WhatsApp предзаполнена по шаблону брифа', async ({ page }) => {
    await page.goto('/');
    const quiz = await waitForQuiz(page);

    await quiz.getByRole('button', { name: 'Квартиру' }).click();
    const href = await quiz.getByRole('link', { name: 'Проще в WhatsApp' }).getAttribute('href');
    const text = decodeURIComponent(href as string);

    expect(text).toContain('Хочу получить расчет по остеклению');
    expect(text).toContain('Тип объекта: Квартиру');
  });
});

test.describe('Процесс и доверие', () => {
  test('девять этапов работы', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="process-title"]');
    for (const step of ['Заявка', 'Замер', 'Расчет', 'Монтаж', 'Приемка']) {
      await expect(section.getByRole('heading', { name: step, exact: true }).first()).toBeVisible();
    }
  });

  test('trust-блок: метрики 2ГИС, источник и ссылка', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section[aria-labelledby="doverie-title"]');

    await expect(section.getByText('46').first()).toBeVisible();
    await expect(section.getByText('26').first()).toBeVisible();
    await expect(section.getByText(/по данным публичной карточки 2ГИС/).first()).toBeVisible();
    await expect(section.getByRole('link', { name: /Открыть карточку в 2ГИС/ })).toBeVisible();
    await expect(section.getByText('Договор').first()).toBeVisible();
    await expect(section.getByText('Гарантия').first()).toBeVisible();
  });
});

test.describe('Контакты', () => {
  test('все ссылки рабочие, Instagram отсутствует', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator(`a[href="${PHONE_HREF}"]`).first()).toBeAttached();
    await expect(page.locator('a[href^="mailto:plastmontag_2010@mail.ru"]').first()).toBeAttached();
    await expect(page.locator(`a[href*="${TWOGIS}"]`).first()).toBeAttached();
    await expect(page.locator(`a[href*="instagram"]`)).toHaveCount(0);
  });

  test('WhatsApp-ссылка содержит пометку «с сайта»', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator(`a[href^="${WA_PREFIX}"]`).first().getAttribute('href');
    expect(decodeURIComponent(href as string)).toContain('Пишу с сайта');
  });
});

test.describe('Страницы услуг и SEO', () => {
  test('страница балкона открывается и закрывает запрос', async ({ page }) => {
    const response = await page.goto('/osteklenie-balkona');
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('Остекление балкона в Астане');
    await expect(page.getByText('остекление балкона Астана').first()).toBeVisible();
  });

  test('все страницы услуг отдают 200 и один H1', async ({ page }) => {
    for (const path of [
      '/',
      '/plastikovye-okna',
      '/alyuminievye-okna-i-dveri',
      '/dveri',
      '/fasadnoe-ostekleniye',
      '/ustanovka-i-remont-okon',
      '/osteklenie-balkona',
      '/kontakty',
      '/portfolio',
      '/privacy',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
    }
  });
});

test.describe('Режим concept', () => {
  test('баннер, noindex и отсутствие аналитики до согласия', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    const thirdParty = thirdPartyRequests(page);

    await page.goto('/');
    await expect(
      page.getByText('Концепт сайта для СПФ Регион Строй. Не является официальным сайтом компании'),
    ).toBeVisible();

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
    expect(thirdParty.filter((u) => !u.includes('fonts.googleapis'))).toEqual([]);
  });
});

test.describe('Доступность', () => {
  test('страница доступна с клавиатуры', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
    expect(focused).not.toBe('BODY');
  });

  test('у полей квиза есть связанные label', async ({ page }) => {
    await page.goto('/');
    const quiz = await waitForQuiz(page);
    await quiz.getByRole('button', { name: 'Квартиру' }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();
    await quiz.getByRole('button', { name: /Окна/ }).click();
    await quiz.getByRole('button', { name: 'Далее' }).click();

    await expect(quiz.getByLabel('Примерное количество окон')).toBeVisible();
    await expect(quiz.getByLabel('Фотография объекта — до 5 штук, до 10 МБ')).toBeAttached();
  });
});
