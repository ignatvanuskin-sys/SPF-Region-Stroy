import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '@/lib/db/json-store';
import { getStore, setStore } from '@/lib/db';
import { createLead, changeLeadStatus, deleteLeadData } from '@/lib/domain/leads';
import { leadSchema, quickLeadSchema } from '@/lib/validation';
import { processOutbox } from '@/lib/domain/notifications';
import type { LeadInput } from '@/lib/validation';

/**
 * Интеграционный тест потока заявки (§8.1) на локальном драйвере хранилища.
 *
 * Проверяем именно то, из-за чего заявки теряются в реальной жизни:
 * двойной клик, повторное обращение по тому же телефону, неверные данные и
 * недоступный канал уведомлений.
 */

const TEMP_DIR = path.join(os.tmpdir(), `spf-test-${randomUUID()}`);
const STORE_FILE = path.join(TEMP_DIR, 'store.json');

function baseInput(overrides: Partial<Record<string, unknown>> = {}): LeadInput {
  return {
    formType: 'quick',
    name: 'Айгуль',
    phone: '+7 701 893 67 87',
    productType: 'okno-pvh',
    consent: true,
    submissionId: randomUUID(),
    ...overrides,
  } as LeadInput;
}

const CONTEXT = { ip: '203.0.113.10', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };

beforeEach(async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true });
  const store = new JsonStore(STORE_FILE);
  await store.init();
  setStore(store);
  // Каналы уведомлений намеренно не настроены: проверяем, что заявка не теряется.
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_LEADS_CHAT_ID;
});

afterAll(async () => {
  setStore(undefined);
  await fs.rm(TEMP_DIR, { recursive: true, force: true });
});

describe('схема заявки', () => {
  it('нормализует телефон и требует согласие', () => {
    const parsed = quickLeadSchema.safeParse({
      formType: 'quick',
      name: 'Айгуль',
      phone: '8 701 893 67 87',
      productType: 'okno-pvh',
      consent: true,
      submissionId: randomUUID(),
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // «8 701…» превращается в канонический вид — иначе дедупликация сломается
      expect(parsed.data.phone).toBe('+77018936787');
    }
  });

  it('не принимает заявку без согласия на обработку данных', () => {
    const parsed = quickLeadSchema.safeParse({
      formType: 'quick',
      name: 'Айгуль',
      phone: '+77018936787',
      productType: 'okno-pvh',
      consent: false,
      submissionId: randomUUID(),
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.message.includes('согласие'))).toBe(true);
    }
  });

  it('отклоняет неверный телефон, пустое имя и ссылку в имени', () => {
    expect(
      quickLeadSchema.safeParse({
        formType: 'quick',
        name: 'Айгуль',
        phone: '123',
        productType: 'okno-pvh',
        consent: true,
        submissionId: randomUUID(),
      }).success,
    ).toBe(false);

    expect(
      quickLeadSchema.safeParse({
        formType: 'quick',
        name: 'А',
        phone: '+77018936787',
        productType: 'okno-pvh',
        consent: true,
        submissionId: randomUUID(),
      }).success,
    ).toBe(false);

    expect(
      quickLeadSchema.safeParse({
        formType: 'quick',
        name: 'купите на http://spam.kz',
        phone: '+77018936787',
        productType: 'okno-pvh',
        consent: true,
        submissionId: randomUUID(),
      }).success,
    ).toBe(false);
  });

  it('распознаёт тип формы и требует обязательные поля заявки для организаций', () => {
    const b2b = leadSchema.safeParse({
      formType: 'b2b',
      name: 'Ерлан',
      phone: '+77018936787',
      consent: true,
      submissionId: randomUUID(),
    });
    expect(b2b.success).toBe(false);

    const good = leadSchema.safeParse({
      formType: 'b2b',
      organization: 'ТОО «Ромашка»',
      name: 'Ерлан',
      phone: '+77018936787',
      consent: true,
      submissionId: randomUUID(),
    });
    expect(good.success).toBe(true);
    if (good.success) expect(good.data.formType).toBe('b2b');
  });
});

describe('создание заявки', () => {
  it('сохраняет заявку и определяет источник как прямой заход', async () => {
    const result = await createLead(baseInput(), CONTEXT);

    expect(result.created).toBe(true);
    expect(result.lead.id).toBeGreaterThan(0);
    expect(result.lead.status).toBe('new');
    expect(result.lead.source).toBe('direct');
    expect(result.lead.device).toBe('mobile');
    expect(result.lead.consent_at).toBeTruthy();
    expect(result.lead.consent_text_version).toBeTruthy();
  });

  it('определяет источник по параметру src — это главный канал атрибуции', async () => {
    const result = await createLead(baseInput({ src: '2gis' }), CONTEXT);
    expect(result.lead.source).toBe('2gis');
  });

  it('определяет источник по referrer, когда src не задан', async () => {
    const result = await createLead(
      baseInput({ referrer: 'https://2gis.kz/astana/firm/123' }),
      CONTEXT,
    );
    expect(result.lead.source).toBe('2gis');
  });

  it('приоритет у src: он побеждает UTM и referrer', async () => {
    const result = await createLead(
      baseInput({ src: 'instagram', utm_source: 'google', referrer: 'https://2gis.kz/' }),
      CONTEXT,
    );
    expect(result.lead.source).toBe('instagram');
  });

  it('не создаёт дубль при повторной отправке той же формы (идемпотентность)', async () => {
    const input = baseInput();
    const first = await createLead(input, CONTEXT);
    const second = await createLead(input, CONTEXT);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(second.lead.id).toBe(first.lead.id);

    const store = getStore();
    expect(await store.countLeads()).toBe(1);
  });

  it('при повторном обращении по тому же телефону добавляет событие, а не новый лид', async () => {
    const first = await createLead(baseInput({ name: 'Айгуль' }), CONTEXT);
    const second = await createLead(baseInput({ name: 'Айгуль', comment: 'нужно ещё одно окно' }), CONTEXT);

    expect(second.created).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.lead.id).toBe(first.lead.id);

    const store = getStore();
    expect(await store.countLeads()).toBe(1);

    const events = await store.listLeadEvents(first.lead.id);
    const duplicateEvent = events.find((event) => event.type === 'duplicate');
    expect(duplicateEvent).toBeDefined();
    expect((duplicateEvent?.payload as any)?.comment).toContain('ещё одно окно');
  });

  it('распознаёт один и тот же номер в разном написании', async () => {
    await createLead(baseInput({ phone: '+7 701 893 67 87' }), CONTEXT);
    const second = await createLead(baseInput({ phone: '8 701 893 67 87' }), CONTEXT);

    // Телефон нормализован до записи в БД, поэтому это то же обращение
    expect(second.duplicate).toBe(true);
  });

  it('создаёт отдельную заявку там, где повтор — это новая сущность (замер, B2B)', async () => {
    await createLead(baseInput(), CONTEXT);
    const second = await createLead(baseInput(), CONTEXT, { duplicateMode: 'create' });

    expect(second.created).toBe(true);
    expect(second.duplicate).toBe(false);

    const store = getStore();
    expect(await store.countLeads()).toBe(2);
  });

  it('пишет событие создания и ставит уведомление в очередь', async () => {
    const result = await createLead(baseInput(), CONTEXT);
    const store = getStore();

    const events = await store.listLeadEvents(result.lead.id);
    expect(events.some((event) => event.type === 'created')).toBe(true);

    const notifications = await store.listNotifications(10);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].payload).toMatchObject({ meta: { leadId: result.lead.id } });
  });

  it('заявка сохраняется, даже когда Telegram не настроен — ничего не теряется', async () => {
    const result = await createLead(baseInput(), CONTEXT);
    const store = getStore();

    // Заявка в базе
    expect(await store.getLead(result.lead.id)).not.toBeNull();

    // Уведомление помечено как неудачное с понятной причиной
    const notifications = await store.listNotifications(10);
    const failed = notifications.find((item) => item.status === 'failed');
    expect(failed).toBeDefined();
    expect(failed?.last_error).toContain('TELEGRAM');
  });

  it('прогон очереди не роняет систему при недоступном канале', async () => {
    await createLead(baseInput(), CONTEXT);
    const result = await processOutbox(5);
    expect(result.processed).toBeGreaterThan(0);
    // Канал не настроен — значит отправок быть не может, но и исключения тоже
    expect(result.sent).toBe(0);
  });

  it('сохраняет конфигурацию калькулятора целиком', async () => {
    const result = await createLead(
      {
        formType: 'calculator',
        name: 'Ерлан',
        phone: '+77017776090',
        consent: true,
        submissionId: randomUUID(),
        calc: {
          productType: 'vitrazh',
          widthMm: 2400,
          heightMm: 2200,
          sections: 3,
          opening: 'fixed',
          quantity: 2,
          color: 'Антрацит',
          glazing: 'Трёхкамерный',
          options: ['Отлив'],
          needInstall: true,
          needDelivery: false,
        },
      } as LeadInput,
      CONTEXT,
    );

    const calc = result.lead.calc_payload as Record<string, unknown>;
    expect(calc.widthMm).toBe(2400);
    expect(calc.quantity).toBe(2);
    expect(calc.options).toEqual(['Отлив']);
    expect(result.lead.product_type).toBe('vitrazh');
  });

  it('помечает заявку организации как B2B и поднимает приоритет', async () => {
    const result = await createLead(
      {
        formType: 'b2b',
        organization: 'ТОО «Ромашка»',
        name: 'Ерлан',
        phone: '+77018936787',
        consent: true,
        submissionId: randomUUID(),
        objectType: 'Офис',
        volume: '40 окон',
      } as LeadInput,
      CONTEXT,
    );

    expect(result.lead.segment).toBe('b2b');
    expect(result.lead.priority).toBe('high');
    // Данные организации попадают в комментарий, чтобы менеджер видел их в карточке
    expect(result.lead.comment).toContain('Ромашка');
    expect(result.lead.comment).toContain('40 окон');
  });
});

describe('работа со статусами и удаление данных', () => {
  it('фиксирует время первой реакции при переходе в «взял в работу»', async () => {
    const { lead } = await createLead(baseInput(), CONTEXT);
    expect(lead.first_response_at).toBeNull();

    const updated = await changeLeadStatus(lead.id, 'taken', { actorLabel: 'Менеджер' });
    expect(updated.status).toBe('taken');
    expect(updated.first_response_at).toBeTruthy();
  });

  it('требует причину для отказа', async () => {
    const { lead } = await createLead(baseInput(), CONTEXT);
    await expect(changeLeadStatus(lead.id, 'lost', {})).rejects.toThrow(/причину/);

    const updated = await changeLeadStatus(lead.id, 'lost', { lostReason: 'expensive' });
    expect(updated.lost_reason).toBe('expensive');
  });

  it('запрещает недопустимый переход', async () => {
    const { lead } = await createLead(baseInput(), CONTEXT);
    await changeLeadStatus(lead.id, 'spam', {});
    await expect(changeLeadStatus(lead.id, 'installed', {})).rejects.toThrow(/Недопустимый переход/);
  });

  it('удаляет заявку вместе с событиями и вложениями по запросу клиента', async () => {
    const { lead } = await createLead(baseInput(), CONTEXT);
    const store = getStore();

    await store.addLeadFile({
      lead_id: lead.id,
      storage_key: 'test.jpg',
      original_name: 'plan.jpg',
      mime: 'image/jpeg',
      size: 1024,
      created_at: new Date().toISOString(),
    });

    await deleteLeadData(lead.id);

    expect(await store.getLead(lead.id)).toBeNull();
    expect(await store.listLeadEvents(lead.id)).toHaveLength(0);
    expect(await store.listLeadFiles(lead.id)).toHaveLength(0);
  });
});
