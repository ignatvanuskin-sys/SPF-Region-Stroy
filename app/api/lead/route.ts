/**
 * POST /api/lead — приём заявки (раздел 11.4).
 *
 *  - multipart/form-data;
 *  - валидация zod на сервере (клиентская дублирует);
 *  - телефон нормализуется в E.164 (+7XXXXXXXXXX);
 *  - антиспам: скрытое поле-ловушка website, лимит 5 заявок / 10 минут на IP,
 *    ограничение размера запроса, проверка MIME и размера файлов;
 *  - данные заявки на сервере НЕ сохраняются (нет БД). В логах только
 *    requestId и статус — без телефона, имени и текста;
 *  - если получатель не настроен → 503 {"error":"not_configured"}.
 */

import { NextResponse } from 'next/server';

import { deliverLead, isLeadDeliveryConfigured, logSafe, type Lead } from '@/lib/leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { leadSchema } from '@/lib/lead-schema';
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, MAX_FILE_SIZE } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Ограничение размера запроса: 5 файлов × 10 МБ + запас на поля. */
const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function requestId(): string {
  return `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function errorResponse(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const id = requestId();

  // 1. Ограничение размера запроса.
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'too_large');
  }

  // 2. Лимит по IP.
  const limit = checkRateLimit(clientIp(request));
  if (!limit.allowed) {
    return errorResponse(429, 'rate_limited', { retryAfter: limit.retryAfterSeconds });
  }

  // 3. Получатель настроен?
  if (!isLeadDeliveryConfigured()) {
    console.warn(`[lead] ${id} not_configured`);
    return errorResponse(503, 'not_configured');
  }

  // 4. Разбор formData.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, 'bad_request');
  }

  const honeypot = String(form.get('website') ?? '');
  if (honeypot.length > 0) {
    // Боту отвечаем «успехом», чтобы он не подбирал обход. Заявка не уходит.
    console.warn(`[lead] ${id} honeypot`);
    return NextResponse.json({ ok: true, requestId: id });
  }

  const raw = {
    mode: (form.get('mode') as string) || 'quick',
    needs: (form.get('needs') as string) || '',
    objectType: (form.get('objectType') as string) || undefined,
    service: (form.get('service') as string) || undefined,
    count: (form.get('count') as string) || undefined,
    sizes: (form.get('sizes') as string) || undefined,
    address: (form.get('address') as string) || undefined,
    name: (form.get('name') as string) || undefined,
    phone: (form.get('phone') as string) || '',
    contactWay: (form.get('contactWay') as string) || undefined,
    comment: (form.get('comment') as string) || undefined,
    page: (form.get('page') as string) || undefined,
    utm: (form.get('utm') as string) || undefined,
    consent: (form.get('consent') as string) || '',
    website: honeypot,
  };

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(422, 'validation', {
      field: first?.path?.join('.') ?? 'form',
      message: first?.message ?? 'invalid',
    });
  }

  // 5. Файлы.
  const files = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (files.length > MAX_FILES) {
    return errorResponse(422, 'validation', { field: 'photos', message: 'too_many_files' });
  }

  const leadFiles: Lead['files'] = [];
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return errorResponse(422, 'validation', { field: 'photos', message: 'bad_mime' });
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(422, 'validation', { field: 'photos', message: 'file_too_large' });
    }
    leadFiles.push({
      name: file.name.slice(0, 120),
      type: file.type,
      size: file.size,
      bytes: await file.arrayBuffer(),
    });
  }

  // 6. Доставка.
  const lead: Lead = {
    mode: parsed.data.mode,
    needs: parsed.data.needs,
    objectType: parsed.data.objectType,
    service: parsed.data.service,
    count: parsed.data.count,
    sizes: parsed.data.sizes,
    address: parsed.data.address,
    name: parsed.data.name,
    phone: parsed.data.phone,
    contactWay: parsed.data.contactWay,
    comment: parsed.data.comment,
    page: parsed.data.page,
    utm: parsed.data.utm,
    files: leadFiles,
    receivedAt: new Date(),
    requestId: id,
  };

  const result = await deliverLead(lead);
  logSafe(result, id);

  if (!result.delivered) {
    return errorResponse(502, 'delivery_failed');
  }

  return NextResponse.json({ ok: true, requestId: id });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
