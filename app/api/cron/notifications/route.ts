import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { processOutbox } from '@/lib/domain/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Прогон очереди уведомлений (§12). Рекомендуемый интервал — раз в 1–5 минут.
 *
 * Делает ровно одну вещь: пробует отправить накопившиеся уведомления и, если
 * канал недоступен, откладывает попытку с нарастающей паузой. Заявка при этом
 * уже в базе — потерять её невозможно.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const result = await processOutbox(25);
  return json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
