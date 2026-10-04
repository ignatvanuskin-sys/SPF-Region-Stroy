import { NextResponse } from 'next/server';
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
import { leadSchema } from '@/lib/validation';
import { createLead, requestMeasurement } from '@/lib/domain/leads';
import { processOutbox } from '@/lib/domain/notifications';
import { getSiteConfig } from '@/lib/domain/settings';
import { calculatePrice, DEFAULT_PRICE_CONFIG, priceResponse, type PriceConfig } from '@/lib/domain/pricing';
import { getStore } from '@/lib/db';
import { whatsappCalculatorText, whatsappGeneralText, whatsappLink } from '@/lib/notify/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Единственная точка создания заявки для всех форм сайта (§8.1, §12).
 *
 * Порядок проверок важен: сначала дешёвые барьеры (origin, лимиты), потом
 * валидация, и только затем запись в БД. Клиент получает понятный текст ошибки
 * на русском и название поля, которое нужно поправить.
 */
export async function POST(request: Request) {
  // 1. CSRF-барьер: запросы с чужих сайтов не принимаем.
  if (!isSameOrigin(request)) {
    return apiError('forbidden', 'Запрос отклонён', 403);
  }

  const ip = clientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 2. Лимит по IP: не больше 8 заявок за 10 минут с одного адреса.
  const ipLimit = rateLimit(`lead:ip:${ip}`, 8, 10 * 60_000);
  if (!ipLimit.ok) return rateLimited(ipLimit.retryAfterSec);

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) return apiError('bad_request', 'Некорректный формат запроса', 400);

  // 3. Простые антиспам-признаки: honeypot и слишком быстрая отправка.
  if (looksLikeBot({ honeypot: body.honeypot as string, elapsedMs: Number(body.elapsedMs) })) {
    // Отвечаем «успехом», чтобы бот не подбирал обход. Заявка не создаётся.
    return json({ ok: true, leadId: 0, duplicate: false, whatsappHref: 'https://wa.me/' });
  }

  // 4. Cloudflare Turnstile — если ключи заданы.
  const turnstileOk = await verifyTurnstile(body.turnstileToken as string | undefined, ip);
  if (!turnstileOk) {
    return apiError('captcha_failed', 'Не удалось подтвердить, что вы не робот. Обновите страницу.', 400);
  }

  // 5. Валидация: клиент проверяет то же самое, сервер — источник истины.
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  // 6. Лимит по телефону: защита от накрутки одним номером.
  const phoneLimit = rateLimit(`lead:phone:${input.phone}`, 3, 60 * 60_000);
  if (!phoneLimit.ok) {
    return apiError(
      'too_many_requests',
      'С этого номера уже отправляли заявку. Мы свяжемся с вами в рабочее время.',
      429,
    );
  }

  try {
    const context = { ip, userAgent };

    // Запись на замер идёт своим путём: сначала проверка слота, потом лид.
    if (input.formType === 'measurement') {
      const result = await requestMeasurement(input, context);
      await processOutbox(5).catch(() => undefined);
      const config = await getSiteConfig();
      return json({
        ok: true,
        leadId: result.lead.id,
        duplicate: result.duplicate,
        whatsappHref: whatsappLink(
          config.whatsappPrimary,
          `Здравствуйте! Записался на замер ${new Date(result.measurement.starts_at).toLocaleString('ru-RU', {
            timeZone: 'Asia/Almaty',
          })}. Заявка №${result.lead.id}.`,
        ),
      });
    }

    const result = await createLead(input, context);

    // Немедленная попытка доставить уведомление. На serverless-тарифах cron
    // может запускаться раз в сутки, а менеджер обязан узнать о заявке сразу.
    // Сбой доставки не влияет на ответ клиенту: заявка уже в базе, повтор
    // произойдёт в следующем прогоне очереди.
    await processOutbox(5).catch(() => undefined);

    // Ответ клиенту: без внутренних полей и без персональных данных.
    const config = await getSiteConfig();
    const whatsappHref = whatsappLink(
      config.whatsappPrimary,
      input.formType === 'calculator' ? whatsappCalculatorText(result.lead) : whatsappGeneralText(result.lead),
    );

    // Цена: в режиме `off` в ответе НЕТ ни одного числа расчёта (§18, критерий 5).
    let price: ReturnType<typeof priceResponse> = { mode: 'off' };
    if (config.priceDisplay === 'range' && input.formType === 'calculator') {
      const stored = (await getStore().getSetting<PriceConfig>('price_rules')) ?? DEFAULT_PRICE_CONFIG;
      price = priceResponse('range', calculatePrice(input.calc, stored));
    }

    return json({
      ok: true,
      leadId: result.lead.id,
      duplicate: result.duplicate,
      idempotent: result.idempotent,
      whatsappHref,
      price,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не удалось создать заявку';
    console.error('[leads] ошибка создания заявки:', message);

    // Понятные тексты бизнес-ошибок (слот занят, отказ без причины и т. п.)
    const businessError = /замер|слот|время|Выберите|Недопустимый переход/i.test(message);
    return apiError(businessError ? 'business_error' : 'server_error', message, businessError ? 409 : 500);
  }
}

/** Явно отклоняем другие методы, чтобы не было «скрытых» точек входа. */
export async function GET(): Promise<NextResponse> {
  return apiError('method_not_allowed', 'Метод не поддерживается', 405);
}
