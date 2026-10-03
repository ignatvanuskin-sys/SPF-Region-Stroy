/**
 * GET /api/cron/reminders — планировщик напоминаний менеджеру.
 *
 * Запускается по расписанию Vercel Cron (см. vercel.json). Один прогон
 * разбирает все созревшие напоминания:
 *   • просрочен контакт с клиентом (SLA 10 минут);
 *   • замер завтра и замер через 2 часа;
 *   • расчёт не отправлен после замера;
 *   • пора запросить отзыв в 2ГИС после монтажа.
 *
 * Защита: заголовок Authorization: Bearer $CRON_SECRET. Vercel добавляет его
 * автоматически, если переменная задана. Без переменной маршрут закрыт
 * в production и открыт локально (NODE_ENV=development).
 */

import { NextResponse } from 'next/server';

import { isDurableStore, runReminders } from '@/lib/pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? '';

  if (!secret) {
    // Без секрета планировщик нельзя открывать наружу.
    return process.env.NODE_ENV !== 'production';
  }

  const header = request.headers.get('authorization') ?? '';
  const url = new URL(request.url);
  const query = url.searchParams.get('key') ?? '';

  return header === `Bearer ${secret}` || query === secret;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runReminders();
    console.info(
      `[cron] reminders scanned=${result.scanned} sent=${result.sent} skipped=${result.skipped} durable_store=${isDurableStore()}`,
    );

    return NextResponse.json({
      ok: true,
      ...result,
      durableStore: isDurableStore(),
      notice: isDurableStore()
        ? undefined
        : 'Хранилище в памяти процесса: на serverless напоминания видят только заявки этого инстанса. Для продовой работы задайте UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN.',
    });
  } catch (error) {
    console.error('[cron] reminders failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
