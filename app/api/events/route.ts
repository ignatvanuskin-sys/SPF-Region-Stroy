import { apiError, clientIp, json, rateLimited, readJson, validationError } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { getStore } from '@/lib/db';
import { eventsSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Приём событий аналитики (§8.7, §12).
 *
 * Работает батчем и принимает только обезличенные данные: имя события, путь,
 * идентификатор сессии и короткие свойства. Телефоны и имена сюда не попадают
 * по замыслу — это проверяется составом схемы.
 *
 * Всегда отвечаем 204: аналитика не должна влиять на поведение интерфейса,
 * поэтому клиент не разбирает ответ.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = rateLimit(`events:${ip}`, 60, 60_000);
  if (!limit.ok) return rateLimited(limit.retryAfterSec);

  const body = await readJson<unknown>(request);
  if (!body) return apiError('bad_request', 'Некорректный формат', 400);

  const parsed = eventsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const now = new Date().toISOString();
  try {
    const store = getStore();
    for (const event of parsed.data.events) {
      await store.recordEvent({
        name: event.name.slice(0, 60),
        session_id: event.sessionId ?? null,
        path: event.path ?? null,
        props: event.props ?? null,
        created_at: event.ts ?? now,
      });
    }
  } catch (error) {
    // Сбой аналитики не должен отражаться на клиенте — просто пишем в лог.
    console.warn('[events] не удалось записать события:', error instanceof Error ? error.message : error);
  }

  return json({ ok: true });
}
