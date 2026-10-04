import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { getStore } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  email: 'E-mail',
  webhook: 'Webhook',
};

/**
 * Журнал уведомлений (§9.9).
 *
 * Показывает, что и когда уходило и что не получилось. Телефоны клиентов здесь
 * не выводятся: в логах им не место (§15). Если уведомление не ушло — заявка
 * всё равно в базе, и это видно в разделе «Заявки» красной пометкой.
 */
export default async function NotificationsPage() {
  const notifications = await getStore().listNotifications(200);

  const failed = notifications.filter((item) => item.status === 'failed').length;
  const pending = notifications.filter((item) => item.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Журнал уведомлений</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Последние 200 записей. Неудачные попытки повторяются автоматически с нарастающей паузой.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={failed > 0 ? 'danger' : 'success'}>Ошибок: {failed}</Badge>
        <Badge tone={pending > 0 ? 'warning' : 'neutral'}>В очереди: {pending}</Badge>
        <Badge tone="neutral">Всего: {notifications.length}</Badge>
      </div>

      {failed > 0 ? (
        <Card className="border-[#f3c6c2] bg-[var(--color-danger-soft)] p-5 text-[0.875rem] leading-relaxed text-[#8a1f19]">
          <p className="font-bold">Что проверить</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Telegram: заданы ли TELEGRAM_BOT_TOKEN и TELEGRAM_LEADS_CHAT_ID, не заблокирован ли бот.</li>
            <li>E-mail: задан ли RESEND_API_KEY и адрес NOTIFY_EMAIL_TO — это запасной канал.</li>
            <li>Cron: вызывается ли /api/cron/notifications с заголовком Authorization: Bearer CRON_SECRET.</li>
          </ol>
        </Card>
      ) : null}

      {notifications.length === 0 ? (
        <EmptyState
          title="Уведомлений пока не было"
          description="Как только придёт первая заявка, здесь появится запись об отправке."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-[0.875rem]">
              <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[0.75rem] uppercase tracking-wider text-[var(--color-ink-muted)]">
                <tr>
                  <th className="p-3 font-semibold">Время</th>
                  <th className="p-3 font-semibold">Канал</th>
                  <th className="p-3 font-semibold">Событие</th>
                  <th className="p-3 font-semibold">Статус</th>
                  <th className="p-3 font-semibold">Попыток</th>
                  <th className="p-3 font-semibold">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => {
                  const payload = item.payload as Record<string, any>;
                  return (
                    <tr key={item.id} className="border-b border-[var(--color-line)] last:border-0">
                      <td className="whitespace-nowrap p-3 text-[var(--color-ink-muted)]">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="p-3">{CHANNEL_LABELS[item.channel] ?? item.channel}</td>
                      <td className="p-3">
                        {payload.kind === 'webhook' ? (
                          <code className="text-[0.75rem]">{payload.event}</code>
                        ) : (
                          <span>
                            {payload.meta?.leadId ? `Заявка #${payload.meta.leadId}` : payload.kind}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          tone={
                            item.status === 'sent' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'
                          }
                        >
                          {item.status === 'sent' ? 'отправлено' : item.status === 'pending' ? 'в очереди' : 'ошибка'}
                        </Badge>
                      </td>
                      <td className="p-3">{item.attempts}</td>
                      <td className="p-3 text-[0.75rem] text-[var(--color-ink-muted)]">
                        {item.last_error ? <span className="break-anywhere">{item.last_error}</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
        В журнале нет телефонов и имён клиентов: для диагностики достаточно номера заявки.
      </p>
    </div>
  );
}
