/**
 * lib/pipeline/store.ts — хранилище заявок для планировщика.
 *
 * Два режима:
 *   1. Upstash Redis (REST) — если заданы UPSTASH_REDIS_REST_URL и
 *      UPSTASH_REDIS_REST_TOKEN. Работает на Vercel: состояние общее для всех
 *      инстансов, напоминания не теряются.
 *   2. Память процесса — резервный режим для локального запуска и concept.
 *
 * ВАЖНО и честно: на serverless-платформе у каждого инстанса своя память,
 * поэтому без Redis планировщик видит только заявки, созданные этим же
 * инстансом. Продовый запуск автоматизации требует Redis (или внешней БД).
 * Проверка настраивается через isDurableStore().
 */

import type { Lead } from './types';

export interface LeadStore {
  mode: 'redis' | 'memory';
  save(lead: Lead): Promise<void>;
  get(id: string): Promise<Lead | null>;
  list(): Promise<Lead[]>;
  update(id: string, patch: Partial<Lead>): Promise<Lead | null>;
}

const INDEX_KEY = 'spf:leads:index';
const leadKey = (id: string) => `spf:lead:${id}`;

/* ── Upstash Redis REST ────────────────────────────────────────── */

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redisCommand<T>(command: (string | number)[]): Promise<T> {
  const config = redisConfig();
  if (!config) throw new Error('redis_not_configured');

  const res = await fetch(`${config.url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`redis_${res.status}`);
  const data = (await res.json()) as { result: T };
  return data.result;
}

const redisStore: LeadStore = {
  mode: 'redis',
  async save(lead) {
    await redisCommand(['SET', leadKey(lead.id), JSON.stringify(lead)]);
    await redisCommand(['SADD', INDEX_KEY, lead.id]);
  },
  async get(id) {
    const raw = await redisCommand<string | null>(['GET', leadKey(id)]);
    return raw ? (JSON.parse(raw) as Lead) : null;
  },
  async list() {
    const ids = await redisCommand<string[]>(['SMEMBERS', INDEX_KEY]);
    if (!ids || ids.length === 0) return [];
    const keys = ids.map(leadKey);
    const values = await redisCommand<(string | null)[]>(['MGET', ...keys]);
    return values
      .filter((v): v is string => Boolean(v))
      .map((v) => JSON.parse(v) as Lead)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async update(id, patch) {
    const current = await redisStore.get(id);
    if (!current) return null;
    const next: Lead = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await redisCommand(['SET', leadKey(id), JSON.stringify(next)]);
    return next;
  },
};

/* ── Память процесса ───────────────────────────────────────────── */

const memory = new Map<string, Lead>();

const memoryStore: LeadStore = {
  mode: 'memory',
  async save(lead) {
    memory.set(lead.id, lead);
  },
  async get(id) {
    return memory.get(id) ?? null;
  },
  async list() {
    return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async update(id, patch) {
    const current = memory.get(id);
    if (!current) return null;
    const next: Lead = { ...current, ...patch, updatedAt: new Date().toISOString() };
    memory.set(id, next);
    return next;
  },
};

/** Хранилище, переживающее перезапуск инстанса. */
export function isDurableStore(): boolean {
  return redisConfig() !== null;
}

export function getStore(): LeadStore {
  return isDurableStore() ? redisStore : memoryStore;
}
