import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { getStore } from '@/lib/db';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from '@/lib/domain/statuses';
import { sourceLabel } from '@/lib/domain/attribution';
import { PRODUCT_TYPE_LABELS } from '@/content/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Экранирование значения для CSV: кавычки удваиваем, поле оборачиваем. */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Экспорт заявок в CSV (§8.8, §9.2).
 *
 * Доступен только с активной сессией админки и только владельцу или менеджеру.
 * Разделитель — точка с запятой, а BOM в начале нужен, чтобы Excel корректно
 * открыл русский текст.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError('unauthorized', 'Нужен вход в админку', 401);
  if (user.role === 'viewer') return apiError('forbidden', 'Экспорт недоступен для просмотра', 403);

  const url = new URL(request.url);
  const statuses = (url.searchParams.get('status') ?? '')
    .split(',')
    .filter((value): value is LeadStatus => LEAD_STATUSES.includes(value as LeadStatus));

  const leads = await getStore().listLeads({
    status: statuses.length ? statuses : undefined,
    limit: 5000,
  });

  const header = [
    'ID',
    'Дата',
    'Сегмент',
    'Имя',
    'Телефон',
    'E-mail',
    'Что нужно',
    'Район',
    'Статус',
    'Источник',
    'Конструкция',
    'Комментарий',
    'UTM',
  ];

  const rows = leads.map((lead) =>
    [
      lead.id,
      lead.created_at,
      lead.segment === 'b2b' ? 'Организация' : 'Частный клиент',
      lead.name,
      lead.phone,
      lead.email ?? '',
      PRODUCT_TYPE_LABELS[lead.product_type ?? ''] ?? '',
      lead.district ?? '',
      LEAD_STATUS_LABELS[lead.status],
      sourceLabel(lead.source),
      lead.calc_payload
        ? `${(lead.calc_payload as any).widthMm ?? '?'}x${(lead.calc_payload as any).heightMm ?? '?'}`
        : '',
      lead.comment ?? '',
      lead.utm ? Object.entries(lead.utm).map(([key, value]) => `${key}=${value}`).join(' ') : '',
    ].map(cell),
  );

  const csv = `\uFEFF${[header.map(cell).join(';'), ...rows.map((row) => row.join(';'))].join('\r\n')}`;
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
