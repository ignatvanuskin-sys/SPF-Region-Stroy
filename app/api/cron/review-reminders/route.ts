import { cronUnauthorized, isCronAuthorized, json } from '@/lib/api';
import { runReviewReminders } from '@/lib/telegram/digest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Напоминание «попросите отзыв» (§8.5, §12). Запускать раз в день.
 *
 * Важно: бот не пишет клиенту сам. Он даёт менеджеру готовую ссылку на
 * WhatsApp с текстом — сообщение отправляет человек. Так проще соблюсти
 * правила WhatsApp о рассылках, и клиент получает живое обращение.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  const result = await runReviewReminders();
  return json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return POST(request);
}
