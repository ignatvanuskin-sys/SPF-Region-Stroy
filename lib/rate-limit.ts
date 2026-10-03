/**
 * lib/rate-limit.ts — антиспам (раздел 11.4): не более 5 заявок за 10 минут на IP.
 *
 * Хранилище в памяти процесса. На Vercel/Netlify каждая инстанция имеет свою
 * память, поэтому лимит — «мягкий»: он защищает от простого перебора, но не
 * является распределённым. Замена на Redis — точка расширения.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_IPS = 5000;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const key = ip || 'unknown';
  const fresh = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (fresh.length >= MAX_REQUESTS) {
    hits.set(key, fresh);
    const oldest = fresh[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  fresh.push(now);
  hits.set(key, fresh);

  if (hits.size > MAX_TRACKED_IPS) {
    // Простейшая уборка: удаляем устаревшие записи.
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
      if (hits.size <= MAX_TRACKED_IPS) break;
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS - fresh.length, retryAfterSeconds: 0 };
}

/** Только для тестов. */
export function resetRateLimit(): void {
  hits.clear();
}
