import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { processOutbox } from '@/lib/domain/notifications';
import { runSlaCheck } from '@/lib/domain/sla';
import { runMeasureReminders } from '@/lib/telegram/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * «Частый» прогон служебных задач (§12).
 *
 * Один эндпоинт вместо трёх отдельных: на бесплатных тарифах хостинга число
 * запланированных задач ограничено, поэтому объединять их практичнее.
 * Что делает:
 *   • отправляет накопившиеся уведомления из очереди (с повторами);
 *   • эскалирует заявки, которые не взяли в работу дольше SLA;
 *   • напоминает о замерах, до которых осталось около двух часов.
 *
 * На Vercel Hobby частота ограничена одним запуском в сутки — этого достаточно
 * как страховка, потому что основная отправка происходит сразу при создании
 * заявки. На тарифе Pro имеет смысл запускать каждые 5 минут:
 *   { "path": "/api/cron/tick", "schedule": "*&#47;5 * * * *" }
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();

  const outbox = await processOutbox(25);
  const sla = await runSlaCheck();
  const reminders = await runMeasureReminders('soon');

  return json({ ok: true, outbox, sla, reminders });
}

export async function GET(request: Request) {
  return POST(request);
}
