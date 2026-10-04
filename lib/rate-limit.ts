/**
 * Простой ограничитель частоты (§8.1, шаг 2; §12).
 *
 * Хранилище — в памяти процесса. Этого достаточно одному инстансу. Если сайт
 * будет развёрнут в несколько реплик, счётчики нужно вынести в общий store
 * (Redis/Postgres) — см. docs/RISKS.md.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(windowMs: number, now: number): void {
  // Чистим не чаще раза в минуту, чтобы не тратить время на каждой заявке.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((time) => now - time < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Через сколько секунд можно повторить. */
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(windowMs, now);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.hits.length, retryAfterSec: 0 };
}

/** Для тестов: сбросить состояние между кейсами. */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = Date.now();
}
