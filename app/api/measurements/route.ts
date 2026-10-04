import {
  apiError,
  clientIp,
  isSameOrigin,
  json,
  looksLikeBot,
  rateLimited,
  readJson,
  validationError,
  verifyTurnstile,
} from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';
import { measurementRequestSchema } from '@/lib/validation';
import { requestMeasurement } from '@/lib/domain/leads';
import { getSiteConfig } from '@/lib/domain/settings';
import { whatsappLink } from '@/lib/notify/templates';
import { SLOT_ERROR_MESSAGES } from '@/lib/domain/measurements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Запрос на замер (§12). Отдельный маршрут нужен для прямых вызовов и для
 * будущего WhatsApp-бота: логика та же, что в /api/leads, но принимает только
 * форму замера.
 *
 * Ответ всегда содержит `status: 'pending'` — без SMS-подтверждения это запрос,
 * который менеджер подтверждает кнопкой в Telegram (§8.3).
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError('forbidden', 'Запрос отклонён', 403);

  const ip = clientIp(request);
  const limit = rateLimit(`measure:ip:${ip}`, 6, 10 * 60_000);
  if (!limit.ok) return rateLimited(limit.retryAfterSec);

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return apiError('bad_request', 'Некорректный формат запроса', 400);
  if (looksLikeBot({ honeypot: body.honeypot as string, elapsedMs: Number(body.elapsedMs) })) {
    return json({ ok: true, leadId: 0, status: 'pending' });
  }

  const turnstileOk = await verifyTurnstile(body.turnstileToken as string | undefined, ip);
  if (!turnstileOk) return apiError('captcha_failed', 'Не удалось подтвердить, что вы не робот', 400);

  const parsed = measurementRequestSchema.safeParse({ ...body, formType: 'measurement' });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await requestMeasurement(parsed.data, {
      ip,
      userAgent: request.headers.get('user-agent'),
    });
    const config = await getSiteConfig();

    return json(
      {
        ok: true,
        leadId: result.lead.id,
        measurementId: result.measurement.id,
        status: result.measurement.status,
        startsAt: result.measurement.starts_at,
        whatsappHref: whatsappLink(
          config.whatsappPrimary,
          `Здравствуйте! Записался на замер. Заявка №${result.lead.id}.`,
        ),
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось записаться на замер';
    const isSlotError = Object.values(SLOT_ERROR_MESSAGES).includes(message);
    return apiError(isSlotError ? 'slot_unavailable' : 'server_error', message, isSlotError ? 409 : 500);
  }
}
