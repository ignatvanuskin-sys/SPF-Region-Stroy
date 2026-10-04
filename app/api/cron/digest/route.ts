import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { runMorningDigest } from '@/lib/telegram/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Утренний дайджест (§10, §12). Запускать в 09:00 по Asia/Almaty.
 *
 * Напоминание про часовой пояс: планировщик обычно работает в UTC, поэтому
 * cron-выражение нужно сдвинуть на 5 часов назад (09:00 Almaty = 04:00 UTC).
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const result = await runMorningDigest();
  return json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
