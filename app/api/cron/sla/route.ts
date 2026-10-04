import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { runSlaCheck } from '@/lib/domain/sla';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Контроль SLA первого ответа (§8.4).
 *
 * Логика живёт в `lib/domain/sla.ts` — она же используется объединённым
 * эндпоинтом `/api/cron/tick`. Здесь только проверка секрета и ответ.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const result = await runSlaCheck();
  return json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
