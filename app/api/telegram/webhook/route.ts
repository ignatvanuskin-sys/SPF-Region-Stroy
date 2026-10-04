import { apiError, json, readJson } from '@/lib/api';
import { handleUpdate } from '@/lib/telegram/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Telegram (§10).
 *
 * Защита: Telegram присылает секрет в заголовке X-Telegram-Bot-Api-Secret-Token.
 * Если он не совпадает с TELEGRAM_WEBHOOK_SECRET, запрос отбрасываем — иначе
 * любой человек мог бы подделать события бота.
 *
 * Всегда отвечаем 200 на корректный запрос: иначе Telegram будет повторять
 * доставку одного и того же апдейта.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return apiError('not_configured', 'TELEGRAM_WEBHOOK_SECRET не задан', 503);
  }

  const provided = request.headers.get('x-telegram-bot-api-secret-token');
  if (provided !== secret) {
    return apiError('unauthorized', 'Неверный секрет', 401);
  }

  const update = await readJson<Record<string, unknown>>(request);
  if (!update) return json({ ok: true });

  try {
    await handleUpdate(update as never);
  } catch (error) {
    // Ошибку логируем, но Telegram всё равно получает 200: повтор апдейта
    // не поможет, если это ошибка в нашей логике.
    console.error('[telegram] ошибка обработки апдейта:', error instanceof Error ? error.message : error);
  }

  return json({ ok: true });
}
