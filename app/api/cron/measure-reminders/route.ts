import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { runMeasureReminders } from '@/lib/telegram/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Напоминания о замерах (§8.3).
 *
 * `?when=tomorrow` — вечернее напоминание накануне (запускать раз в день),
 * `?when=soon` (по умолчанию) — за 2 часа до выезда (каждые 15 минут).
 * Повторные запуски безопасны: факт отправки фиксируется в истории лида.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();

  const when = new URL(request.url).searchParams.get('when') === 'tomorrow' ? 'tomorrow' : 'soon';
  const result = await runMeasureReminders(when);
  return json({ ok: true, when, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
