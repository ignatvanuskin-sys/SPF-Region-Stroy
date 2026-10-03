/**
 * lib/pipeline/crm.ts — передача заявки в CRM.
 *
 * Поддержаны три адаптера, выбор автоматический по заданным переменным:
 *   1. Bitrix24  — входящий вебхук, метод crm.lead.add + задача менеджеру.
 *   2. amoCRM    — API v4, /api/v4/leads/complex (сделка + контакт).
 *   3. Webhook   — универсальный JSON POST для любой другой системы.
 *
 * Общее для всех: заголовок X-Idempotency-Key = id заявки, до 3 попыток
 * с нарастающей паузой. Ошибка CRM не теряет заявку: она уже доставлена
 * менеджеру в Telegram, а статус синхронизации пишется в карточку заявки.
 */

import { CATEGORY_LABEL, PROCESS, type Lead } from './types';

export interface CrmResult {
  provider: string;
  ok: boolean;
  id?: string;
  error?: string;
}

export function crmProvider(): 'bitrix24' | 'amocrm' | 'webhook' | null {
  if (process.env.BITRIX24_WEBHOOK_URL) return 'bitrix24';
  if (process.env.AMOCRM_SUBDOMAIN && process.env.AMOCRM_ACCESS_TOKEN) return 'amocrm';
  if (process.env.CRM_WEBHOOK_URL) return 'webhook';
  return null;
}

export function isCrmConfigured(): boolean {
  return crmProvider() !== null;
}

/** Единый текст заявки для описания сделки. */
export function crmDescription(lead: Lead): string {
  return [
    `Категория: ${CATEGORY_LABEL[lead.category]}`,
    `Объект: ${lead.objectType || '—'}`,
    `Количество: ${lead.count || '—'}`,
    `Размеры: ${lead.sizes || '—'}`,
    `Адрес: ${lead.address || '—'}`,
    `Связь: ${lead.contactWay === 'whatsapp' ? 'WhatsApp' : lead.contactWay === 'call' ? 'звонок' : '—'}`,
    `Фото: ${lead.photos.length}`,
    lead.measurementSlot ? `Желаемый замер: ${lead.measurementSlot}` : 'Замер: не выбран',
    `Комментарий: ${lead.comment || '—'}`,
    `Страница: ${lead.page || '—'}`,
    `Источник: ${lead.utm || 'нет'}`,
    `Номер заявки: ${lead.reference}`,
  ].join('\n');
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** i));
      }
    }
  }
  throw lastError;
}

function title(lead: Lead): string {
  const who = lead.name || lead.phone;
  return `Сайт: ${CATEGORY_LABEL[lead.category]} — ${who}`;
}

async function sendBitrix24(lead: Lead): Promise<CrmResult> {
  const base = (process.env.BITRIX24_WEBHOOK_URL ?? '').replace(/\/$/, '');
  const url = `${base}/crm.lead.add.json`;

  const payload = {
    fields: {
      TITLE: title(lead),
      NAME: lead.name || 'С сайта',
      PHONE: [{ VALUE: lead.phone, VALUE_TYPE: 'WORK' }],
      EMAIL: lead.email ? [{ VALUE: lead.email, VALUE_TYPE: 'WORK' }] : undefined,
      COMMENTS: crmDescription(lead),
      SOURCE_ID: 'WEB',
      SOURCE_DESCRIPTION: 'Сайт spf-region-stroy',
      ASSIGNED_BY_ID: process.env.BITRIX24_ASSIGNED_BY_ID || undefined,
    },
    params: { REGISTER_SONET_EVENT: 'Y' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': lead.id,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) return { provider: 'bitrix24', ok: false, error: `http_${res.status}` };
  const data = (await res.json()) as { result?: number; error?: string };
  if (data.error) return { provider: 'bitrix24', ok: false, error: data.error };

  // Задача менеджеру: связаться в течение SLA.
  if (data.result) {
    const due = new Date(Date.now() + PROCESS.contactSlaMinutes * 60 * 1000).toISOString();
    try {
      await fetch(`${base}/tasks.task.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': `${lead.id}:task` },
        body: JSON.stringify({
          fields: {
            TITLE: `Связаться с клиентом (${CATEGORY_LABEL[lead.category]})`,
            DESCRIPTION: crmDescription(lead),
            RESPONSIBLE_ID: process.env.BITRIX24_ASSIGNED_BY_ID || undefined,
            DEADLINE: due,
            UF_CRM_TASK: [`L_${data.result}`],
          },
        }),
        cache: 'no-store',
      });
    } catch {
      // Задача — необязательный шаг: заявка уже создана.
    }
  }

  return { provider: 'bitrix24', ok: true, id: data.result ? String(data.result) : undefined };
}

async function sendAmoCrm(lead: Lead): Promise<CrmResult> {
  const subdomain = process.env.AMOCRM_SUBDOMAIN ?? '';
  const token = process.env.AMOCRM_ACCESS_TOKEN ?? '';
  const pipelineId = process.env.AMOCRM_PIPELINE_ID;

  const body = [
    {
      name: title(lead),
      ...(pipelineId ? { pipeline_id: Number(pipelineId) } : {}),
      _embedded: {
        contacts: [
          {
            first_name: lead.name || 'Клиент с сайта',
            custom_fields_values: [
              {
                field_code: 'PHONE',
                values: [{ value: lead.phone, enum_code: 'WORK' }],
              },
              ...(lead.email
                ? [
                    {
                      field_code: 'EMAIL',
                      values: [{ value: lead.email, enum_code: 'WORK' }],
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    },
  ];

  const res = await fetch(`https://${subdomain}.amocrm.ru/api/v4/leads/complex`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': lead.id,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) return { provider: 'amocrm', ok: false, error: `http_${res.status}` };
  const data = (await res.json()) as { _embedded?: { leads?: { id: number }[] } };
  const id = data._embedded?.leads?.[0]?.id;
  return { provider: 'amocrm', ok: true, id: id ? String(id) : undefined };
}

async function sendWebhook(lead: Lead): Promise<CrmResult> {
  const url = process.env.CRM_WEBHOOK_URL ?? '';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': lead.id,
      ...(process.env.CRM_WEBHOOK_SECRET
        ? { 'X-Webhook-Secret': process.env.CRM_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({
      id: lead.id,
      reference: lead.reference,
      stage: lead.stage,
      category: lead.category,
      categoryLabel: CATEGORY_LABEL[lead.category],
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      contactWay: lead.contactWay,
      comment: lead.comment,
      objectType: lead.objectType,
      count: lead.count,
      sizes: lead.sizes,
      address: lead.address,
      measurementSlot: lead.measurementSlot,
      photosCount: lead.photos.length,
      page: lead.page,
      utm: lead.utm,
      createdAt: lead.createdAt,
      description: crmDescription(lead),
    }),
    cache: 'no-store',
  });

  return res.ok
    ? { provider: 'webhook', ok: true, id: res.headers.get('x-record-id') ?? undefined }
    : { provider: 'webhook', ok: false, error: `http_${res.status}` };
}

/** Отправляет заявку в настроенную CRM. Никогда не бросает исключение. */
export async function pushToCrm(lead: Lead): Promise<CrmResult> {
  const provider = crmProvider();
  if (!provider) return { provider: 'none', ok: false, error: 'not_configured' };

  try {
    return await withRetry(() =>
      provider === 'bitrix24'
        ? sendBitrix24(lead)
        : provider === 'amocrm'
          ? sendAmoCrm(lead)
          : sendWebhook(lead),
    );
  } catch (error) {
    return {
      provider,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}
