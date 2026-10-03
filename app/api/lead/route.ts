/**
 * POST /api/lead — приём заявки и запуск воронки.
 *
 * Порядок обработки: валидация → слот замера → сохранение → уведомление
 * менеджера → подтверждение клиенту → CRM. Заявка сохраняется до побочных
 * эффектов, поэтому ошибка CRM или почты не приводит к потере клиента.
 *
 * Если канал связи с менеджером не настроен, отвечаем 503 и честной ошибкой:
 * показывать «отправлено» без получателя запрещено.
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { createLead, isManagerChannelConfigured, isValidSlot, availableSlots } from '@/lib/pipeline';
import type { LeadCategory } from '@/lib/pipeline/types';
import { leadSchema } from '@/lib/lead-schema';
import { checkRateLimit } from '@/lib/rate-limit';
import { ACCEPTED_IMAGE_TYPES, MAX_FILES, MAX_FILE_SIZE } from '@/lib/validation';
import { waLink } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function errorResponse(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = randomUUID();

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_REQUEST_BYTES) return errorResponse(413, 'too_large');

  const limit = checkRateLimit(clientIp(request));
  if (!limit.allowed) {
    return errorResponse(429, 'rate_limited', { retryAfter: limit.retryAfterSeconds });
  }

  if (!isManagerChannelConfigured()) {
    console.warn(`[lead] ${requestId} not_configured`);
    return errorResponse(503, 'not_configured');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse(400, 'bad_request');
  }

  const honeypot = String(form.get('website') ?? '');
  if (honeypot.length > 0) {
    console.warn(`[lead] ${requestId} honeypot`);
    return NextResponse.json({ ok: true, requestId });
  }

  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' && value !== '' ? value : undefined;
  };

  const parsed = leadSchema.safeParse({
    mode: field('mode') ?? 'quick',
    category: field('category') ?? 'other',
    needs: field('needs'),
    objectType: field('objectType'),
    service: field('service'),
    count: field('count'),
    sizes: field('sizes'),
    address: field('address'),
    name: field('name'),
    phone: field('phone') ?? '',
    email: field('email'),
    contactWay: field('contactWay'),
    comment: field('comment'),
    measurementSlot: field('measurementSlot'),
    page: field('page'),
    utm: field('utm'),
    consent: field('consent') ?? '',
    website: honeypot,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(422, 'validation', {
      field: first?.path?.join('.') ?? 'form',
      message: first?.message ?? 'invalid',
    });
  }

  // Слот замера принимаем только из реальной сетки: иначе заявка с «замером»
  // в нерабочее время уйдёт менеджеру как согласованная.
  const slot = parsed.data.measurementSlot;
  if (slot && !isValidSlot(slot)) {
    return errorResponse(422, 'validation', {
      field: 'measurementSlot',
      message: 'slot_unavailable',
      slots: availableSlots().slice(0, 12).map((s) => s.iso),
    });
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File);
  if (files.length > MAX_FILES) {
    return errorResponse(422, 'validation', { field: 'photos', message: 'too_many_files' });
  }

  const photos: { name: string; type: string; size: number }[] = [];
  const attachments: { name: string; type: string; size: number; bytes: ArrayBuffer }[] = [];

  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      return errorResponse(422, 'validation', { field: 'photos', message: 'bad_mime' });
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(422, 'validation', { field: 'photos', message: 'file_too_large' });
    }
    const name = file.name.slice(0, 120);
    photos.push({ name, type: file.type, size: file.size });
    attachments.push({ name, type: file.type, size: file.size, bytes: await file.arrayBuffer() });
  }

  const result = await createLead({
    category: parsed.data.category as LeadCategory,
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    contactWay: parsed.data.contactWay,
    comment: parsed.data.comment,
    objectType: parsed.data.objectType,
    count: parsed.data.count,
    sizes: parsed.data.sizes,
    address: parsed.data.address,
    measurementSlot: slot,
    photos,
    page: parsed.data.page,
    utm: parsed.data.utm,
  });

  // Фото уходят менеджеру отдельным сообщением: они не должны блокировать заявку.
  if (attachments.length > 0) {
    const { sendLeadPhotos } = await import('@/lib/pipeline/photos');
    await sendLeadPhotos(result.lead, attachments);
  }

  console.info(
    `[lead] ${result.lead.reference} stage=${result.lead.stage} crm=${result.crm.provider}:${result.crm.ok} manager=${result.manager.ok} client=${result.client.ok}`,
  );

  if (!result.manager.ok && !result.crm.ok) {
    return errorResponse(502, 'delivery_failed');
  }

  return NextResponse.json({
    ok: true,
    id: result.lead.id,
    reference: result.lead.reference,
    stage: result.lead.stage,
    whatsapp: waLink({ context: 'calculation' }),
    crm: { provider: result.crm.provider, ok: result.crm.ok },
    clientNotified: result.client.ok,
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
