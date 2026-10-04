import Link from 'next/link';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Input, Select } from '@/components/ui/form-controls';
import { Button } from '@/components/ui/button';
import { getStore } from '@/lib/db';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  type LeadStatus,
} from '@/lib/domain/statuses';
import { SOURCE_LABELS, sourceLabel } from '@/lib/domain/attribution';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from '@/content/site';
import { formatDateTime } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';
import { leadDeliveryState } from '@/lib/domain/notifications';

export const dynamic = 'force-dynamic';

/**
 * Список заявок (§9.2).
 *
 * Фильтры живут в адресе страницы: ссылку на выборку можно сохранить в закладки
 * или переслать коллеге. Поиск идёт по имени, телефону и комментарию.
 *
 * Красная пометка «не доставлено» означает, что уведомление менеджеру не
 * ушло — сама заявка при этом сохранена и её видно здесь.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; product?: string; q?: string; segment?: string }>;
}) {
  const params = await searchParams;
  const store = getStore();

  const statuses = (params.status ?? '')
    .split(',')
    .filter((value): value is LeadStatus => LEAD_STATUSES.includes(value as LeadStatus));

  const leads = await store.listLeads({
    status: statuses.length ? statuses : undefined,
    source: params.source || undefined,
    productType: params.product || undefined,
    segment: params.segment === 'b2b' ? 'b2b' : undefined,
    search: params.q || undefined,
    limit: 200,
  });

  // Состояние доставки считаем только для строк на экране — иначе на каждую
  // заявку уходил бы отдельный проход по журналу уведомлений.
  const deliveryStates = await Promise.all(
    leads.slice(0, 60).map(async (lead) => [lead.id, await leadDeliveryState(lead.id)] as const),
  );
  const deliveryById = new Map(deliveryStates);

  const hasFilters = Boolean(params.status || params.source || params.product || params.q || params.segment);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заявки</h1>
          <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
            Найдено: {leads.length}
            {hasFilters ? ' (с учётом фильтров)' : ''}
          </p>
        </div>
        <a
          href={`/api/admin/export${statuses.length ? `?status=${statuses.join(',')}` : ''}`}
          className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3.5 text-[0.8125rem] font-semibold transition-colors hover:border-[var(--color-ink)]"
        >
          Экспорт в CSV
        </a>
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <span className="block text-[0.75rem] font-semibold text-[var(--color-ink-soft)]">Поиск</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-muted)]"
                aria-hidden="true"
              />
              <Input name="q" defaultValue={params.q ?? ''} placeholder="Имя или телефон" className="pl-9" />
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[0.75rem] font-semibold text-[var(--color-ink-soft)]">Статус</span>
            <Select name="status" defaultValue={params.status ?? ''}>
              <option value="">Все статусы</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[0.75rem] font-semibold text-[var(--color-ink-soft)]">Источник</span>
            <Select name="source" defaultValue={params.source ?? ''}>
              <option value="">Все источники</option>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[0.75rem] font-semibold text-[var(--color-ink-soft)]">Что нужно</span>
            <Select name="product" defaultValue={params.product ?? ''}>
              <option value="">Все конструкции</option>
              {PRODUCT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[0.75rem] font-semibold text-[var(--color-ink-soft)]">Сегмент</span>
            <Select name="segment" defaultValue={params.segment ?? ''}>
              <option value="">Все</option>
              <option value="b2b">Только организации</option>
            </Select>
          </label>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <Button type="submit" variant="primary" size="sm">
              Применить
            </Button>
            {hasFilters ? (
              <Link
                href="/admin/leads"
                className="inline-flex min-h-10 items-center px-3 text-[0.8125rem] font-medium text-[var(--color-ink-soft)] underline underline-offset-2"
              >
                Сбросить
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {leads.length === 0 ? (
        <EmptyState
          title="Заявок не найдено"
          description={
            hasFilters
              ? 'Попробуйте изменить фильтры или сбросить их.'
              : 'Как только клиент отправит форму, заявка появится здесь.'
          }
          action={
            hasFilters ? (
              <Link
                href="/admin/leads"
                className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-4 text-[0.8125rem] font-semibold"
              >
                Сбросить фильтры
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-[0.875rem]">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[0.75rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3 font-semibold">#</th>
                  <th className="p-3 font-semibold">Клиент</th>
                  <th className="p-3 font-semibold">Что нужно</th>
                  <th className="p-3 font-semibold">Район</th>
                  <th className="p-3 font-semibold">Источник</th>
                  <th className="p-3 font-semibold">Статус</th>
                  <th className="p-3 font-semibold">Получена</th>
                  <th className="p-3 font-semibold">Доставка</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const delivery = deliveryById.get(lead.id);
                  return (
                    <tr key={lead.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-surface-alt)]">
                      <td className="p-3 font-semibold">
                        <Link href={`/admin/leads/${lead.id}`} className="text-[var(--color-glass)] hover:underline">
                          {lead.id}
                        </Link>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">
                          {lead.name}
                          {lead.segment === 'b2b' ? (
                            <Badge tone="progress" className="ml-2">
                              B2B
                            </Badge>
                          ) : null}
                        </p>
                        <a href={`tel:${lead.phone}`} className="text-[0.75rem] text-[var(--color-ink-muted)] hover:underline">
                          {formatPhone(lead.phone)}
                        </a>
                      </td>
                      <td className="p-3">{PRODUCT_TYPE_LABELS[lead.product_type ?? 'other'] ?? '—'}</td>
                      <td className="p-3 text-[var(--color-ink-soft)]">{lead.district ?? '—'}</td>
                      <td className="p-3">{sourceLabel(lead.source)}</td>
                      <td className="p-3">
                        <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap text-[var(--color-ink-muted)]">
                        {formatDateTime(lead.created_at)}
                      </td>
                      <td className="p-3">
                        {delivery?.delivered ? (
                          <Badge tone="success">доставлено</Badge>
                        ) : delivery?.pending ? (
                          <Badge tone="warning">в очереди</Badge>
                        ) : (
                          <Badge tone="danger" title={delivery?.lastError ?? undefined}>
                            не доставлено
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {leads.length >= 200 ? (
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          Показаны первые 200 заявок. Уточните фильтры или выгрузите всё в CSV.
        </p>
      ) : null}
    </div>
  );
}
