/**
 * lib/pipeline/index.ts — оркестратор воронки.
 *
 * Путь клиента целиком:
 *   заявка с фото → подтверждение клиенту → CRM → напоминание менеджеру →
 *   замер → расчёт → монтаж → запрос отзыва в 2ГИС.
 *
 * Побочные эффекты (CRM, Telegram, email) никогда не валят приём заявки:
 * заявка сохраняется в хранилище первой, дальше каждый шаг фиксируется
 * в её карточке отдельно.
 */

import { randomUUID, randomBytes } from 'node:crypto';

import { pushToCrm, isCrmConfigured } from './crm';
import { confirmToClient, notifyManagerAboutLead } from './notify';
import { dueReminders, nextActionFor } from './reminders';
import { getStore, isDurableStore } from './store';
import {
  LEAD_CATEGORIES,
  STAGES,
  nowIso,
  type Lead,
  type LeadCategory,
  type Stage,
} from './types';
import { isLeadDeliveryConfigured } from '@/lib/leads';

export * from './types';
export * from './schedule';
export * from './store';
export * from './crm';
export * from './reminders';

/** Короткий номер заявки для устной сверки: СПФ-2604-7F3A. */
function makeReference(createdAt: string): string {
  const d = new Date(createdAt);
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `СПФ-${yy}${mm}-${suffix}`;
}

export interface CreateLeadInput {
  category: LeadCategory;
  name?: string;
  phone: string;
  email?: string;
  contactWay?: 'whatsapp' | 'call';
  comment?: string;
  objectType?: string;
  count?: string;
  sizes?: string;
  address?: string;
  measurementSlot?: string;
  photos: { name: string; type: string; size: number }[];
  page?: string;
  utm?: string;
}

export interface CreateLeadResult {
  lead: Lead;
  crm: { attempted: boolean; ok: boolean; provider: string; error?: string };
  manager: { ok: boolean; error?: string };
  client: { ok: boolean; error?: string };
}

/** Канал доставки заявки менеджеру настроен? */
export function isManagerChannelConfigured(): boolean {
  return isLeadDeliveryConfigured();
}

export async function createLead(input: CreateLeadInput): Promise<CreateLeadResult> {
  const createdAt = nowIso();
  const store = getStore();

  const lead: Lead = {
    id: randomUUID(),
    token: randomBytes(16).toString('hex'),
    stage: 'new',
    category: LEAD_CATEGORIES.includes(input.category) ? input.category : 'other',
    createdAt,
    updatedAt: createdAt,
    name: input.name,
    phone: input.phone,
    email: input.email,
    contactWay: input.contactWay,
    comment: input.comment,
    objectType: input.objectType,
    count: input.count,
    sizes: input.sizes,
    address: input.address,
    photos: input.photos,
    measurementSlot: input.measurementSlot,
    page: input.page,
    utm: input.utm,
    sentReminders: [],
    reference: makeReference(createdAt),
  };

  // 1. Сначала сохраняем: заявка не должна потеряться ни при какой ошибке ниже.
  await store.save(lead);

  // 2. Менеджеру в Telegram — самое важное действие.
  const manager = await notifyManagerAboutLead(lead);

  // 3. Автоматическое подтверждение клиенту.
  const client = await confirmToClient(lead);

  // 4. CRM.
  let crm: CreateLeadResult['crm'] = {
    attempted: false,
    ok: false,
    provider: 'none',
  };
  if (isCrmConfigured()) {
    const result = await pushToCrm(lead);
    crm = { attempted: true, ok: result.ok, provider: result.provider, error: result.error };
    lead.crm = {
      provider: result.provider,
      id: result.id,
      ok: result.ok,
      at: nowIso(),
      error: result.error,
    };
  }

  lead.stage = manager.ok ? 'confirmed' : 'new';
  if (crm.ok) lead.stage = 'crm_synced';
  lead.updatedAt = nowIso();
  const next = nextActionFor(lead);
  if (next) {
    lead.nextAction = next.kind;
    lead.nextActionAt = next.at;
  }
  await store.save(lead);

  return { lead, crm, manager, client };
}

/** Переводит заявку на следующий этап вручную (менеджер через карточку/CRM). */
export async function advanceStage(
  id: string,
  stage: Stage,
  patch: Partial<Lead> = {},
): Promise<Lead | null> {
  if (!STAGES.includes(stage)) return null;
  const store = getStore();
  const current = await store.get(id);
  if (!current) return null;

  const merged: Lead = { ...current, ...patch, stage, updatedAt: nowIso() };
  const next = nextActionFor(merged);
  merged.nextAction = next?.kind;
  merged.nextActionAt = next?.at;

  return store.update(id, merged);
}

export { isDurableStore };

export interface RunRemindersResult {
  scanned: number;
  sent: number;
  skipped: number;
  details: { leadId: string; kind: string; ok: boolean; error?: string }[];
}

/** Разбирает созревшие напоминания. Вызывается планировщиком. */
export async function runReminders(now: Date = new Date()): Promise<RunRemindersResult> {
  const store = getStore();
  const leads = await store.list();
  const due = dueReminders(leads, now);

  const details: RunRemindersResult['details'] = [];
  let sent = 0;

  for (const reminder of due) {
    const { notifyManagerReminder } = await import('./notify');
    const result = await notifyManagerReminder(reminder.title, reminder.body, reminder.urgent);

    if (result.ok) {
      sent += 1;
      const lead = await store.get(reminder.leadId);
      if (lead) {
        const sentReminders = [...lead.sentReminders, reminder.kind];
        const merged: Lead = { ...lead, sentReminders };
        const next = nextActionFor(merged);
        await store.update(reminder.leadId, {
          sentReminders,
          nextAction: next?.kind,
          nextActionAt: next?.at,
        });
      }
    }

    details.push({
      leadId: reminder.leadId,
      kind: reminder.kind,
      ok: result.ok,
      error: result.error,
    });
  }

  return { scanned: leads.length, sent, skipped: due.length - sent, details };
}
