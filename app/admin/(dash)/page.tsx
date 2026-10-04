import Link from 'next/link';
import { Clock, Inbox, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { getStore } from '@/lib/db';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_TONE } from '@/lib/domain/statuses';
import { sourceLabel } from '@/lib/domain/attribution';
import { PRODUCT_TYPE_LABELS } from '@/content/site';
import { formatDateTime, formatDuration, pluralRu } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/**
 * Обзор (§9.1).
 *
 * Главное — числами, а не графиками: владельцу нужно за пять секунд понять,
 * сколько заявок пришло, сколько не обработано и как быстро команда отвечает.
 * Диаграммы здесь были бы украшением, а не инструментом.
 */
export default async function AdminDashboard() {
  const store = getStore();
  const now = new Date();

  const dayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();

  const [leads, weekLeads, monthLeads, newLeads, upcomingMeasurements] = await Promise.all([
    store.listLeads({ from: dayAgo, limit: 500 }),
    store.listLeads({ from: weekAgo, limit: 1000 }),
    store.listLeads({ from: monthAgo, limit: 2000 }),
    store.listLeads({ status: ['new'], limit: 50 }),
    store.listMeasurements({
      from: now.toISOString(),
      to: new Date(now.getTime() + 7 * 24 * 3600_000).toISOString(),
    }),
  ]);

  // Среднее время первой реакции: от создания до перехода в «взял в работу».
  const responded = monthLeads.filter((lead) => lead.first_response_at);
  const averageResponseMs =
    responded.length > 0
      ? responded.reduce(
          (sum, lead) =>
            sum + (new Date(lead.first_response_at!).getTime() - new Date(lead.created_at).getTime()),
          0,
        ) / responded.length
      : null;

  const within15 = responded.filter(
    (lead) => new Date(lead.first_response_at!).getTime() - new Date(lead.created_at).getTime() <= 15 * 60_000,
  ).length;

  const bySource = new Map<string, number>();
  for (const lead of weekLeads) bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);

  const byProduct = new Map<string, number>();
  for (const lead of weekLeads) {
    const key = lead.product_type ?? 'other';
    byProduct.set(key, (byProduct.get(key) ?? 0) + 1);
  }

  const funnel = LEAD_STATUSES.map((status) => ({
    status,
    count: weekLeads.filter((lead) => lead.status === status).length,
  })).filter((row) => row.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Данные на {formatDateTime(now)} (Asia/Almaty)
        </p>
      </div>

      {/* Ключевые числа */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            Заявки сегодня
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{leads.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            За 7 дней
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{weekLeads.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            За 30 дней
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{monthLeads.length}</p>
        </Card>
        <Card className={newLeads.length > 0 ? 'border-[#f3c6c2] bg-[var(--color-danger-soft)] p-5' : 'p-5'}>
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            Не обработано
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">{newLeads.length}</p>
          {newLeads.length > 0 ? (
            <Link href="/admin/leads?status=new" className="mt-1 inline-block text-[0.8125rem] font-semibold underline underline-offset-2">
              Взять в работу
            </Link>
          ) : (
            <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">Всё разобрано</p>
          )}
        </Card>
      </div>

      {/* Скорость реакции */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="flex items-center gap-2 font-bold">
            <Clock className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
            Скорость первой реакции
          </p>
          <p className="mt-3 text-2xl font-extrabold">
            {averageResponseMs === null ? '—' : formatDuration(averageResponseMs)}
          </p>
          <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {averageResponseMs === null
              ? 'Пока нет заявок с зафиксированной реакцией. Метрика появится, когда заявку возьмут в работу.'
              : `Среднее по ${responded.length} ${pluralRu(responded.length, 'заявке', 'заявкам', 'заявкам')} за 30 дней.`}
          </p>
          {responded.length > 0 ? (
            <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-soft)]">
              Обработано за 15 минут: <strong>{within15}</strong> из {responded.length} (
              {Math.round((within15 / responded.length) * 100)}%)
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <p className="flex items-center gap-2 font-bold">
            <Inbox className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
            Замеры на 7 дней
          </p>
          <p className="mt-3 text-2xl font-extrabold">{upcomingMeasurements.length}</p>
          <Link href="/admin/measurements" className="mt-1 inline-block text-[0.8125rem] font-semibold text-[var(--color-glass)] underline underline-offset-2">
            Открыть календарь
          </Link>
        </Card>
      </div>

      {/* Разбивки */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-2 font-bold">
            <TrendingUp className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
            Источники за 7 дней
          </p>
          {bySource.size === 0 ? (
            <p className="mt-3 text-[0.875rem] text-[var(--color-ink-muted)]">Пока нет данных.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...bySource.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => (
                  <li key={source} className="flex items-center justify-between gap-3 text-[0.875rem]">
                    <span className="truncate">{sourceLabel(source)}</span>
                    <span className="shrink-0 font-semibold">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <p className="font-bold">Виды конструкций за 7 дней</p>
          {byProduct.size === 0 ? (
            <p className="mt-3 text-[0.875rem] text-[var(--color-ink-muted)]">Пока нет данных.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...byProduct.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([product, count]) => (
                  <li key={product} className="flex items-center justify-between gap-3 text-[0.875rem]">
                    <span className="truncate">{PRODUCT_TYPE_LABELS[product] ?? product}</span>
                    <span className="shrink-0 font-semibold">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <p className="font-bold">Воронка за 7 дней</p>
          {funnel.length === 0 ? (
            <p className="mt-3 text-[0.875rem] text-[var(--color-ink-muted)]">Пока нет данных.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {funnel.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3 text-[0.875rem]">
                  <Badge tone={LEAD_STATUS_TONE[row.status]}>{LEAD_STATUS_LABELS[row.status]}</Badge>
                  <span className="shrink-0 font-semibold">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Последние заявки */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] p-5">
          <p className="font-bold">Последние заявки</p>
          <Link href="/admin/leads" className="text-[0.8125rem] font-semibold text-[var(--color-glass)] underline underline-offset-2">
            Все заявки
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Заявок пока нет"
              description="Как только клиент отправит форму, заявка появится здесь и придёт в Telegram."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left text-[0.875rem]">
              <thead className="border-b border-[var(--color-line)] text-[0.75rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3 font-semibold">#</th>
                  <th className="p-3 font-semibold">Клиент</th>
                  <th className="p-3 font-semibold">Что нужно</th>
                  <th className="p-3 font-semibold">Источник</th>
                  <th className="p-3 font-semibold">Статус</th>
                  <th className="p-3 font-semibold">Время</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 12).map((lead) => (
                  <tr key={lead.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="p-3 font-semibold">
                      <Link href={`/admin/leads/${lead.id}`} className="text-[var(--color-glass)] hover:underline">
                        {lead.id}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-[0.75rem] text-[var(--color-ink-muted)]">{formatPhone(lead.phone)}</p>
                    </td>
                    <td className="p-3">{PRODUCT_TYPE_LABELS[lead.product_type ?? 'other'] ?? '—'}</td>
                    <td className="p-3">{sourceLabel(lead.source)}</td>
                    <td className="p-3">
                      <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
                    </td>
                    <td className="p-3 text-[var(--color-ink-muted)]">{formatDateTime(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
