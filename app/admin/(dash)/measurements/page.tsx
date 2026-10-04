import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { ActionForm, InlineActionForm } from '@/components/admin/action-form';
import {
  blackoutAddAction,
  blackoutRemoveAction,
  measurementRulesAction,
  measurementUpdateAction,
} from '@/app/admin/actions';
import { getStore } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { formatDateTime, formatTime } from '@/lib/utils';
import { formatPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Замеры (§9.3).
 *
 * Календарь сознательно сделан списком по дням: на телефоне список читается
 * лучше сетки, а менеджеру важно не «увидеть неделю», а не забыть про завтрашний
 * выезд. Правила записи и закрытые даты правятся здесь же.
 */
export default async function MeasurementsPage() {
  const store = getStore();
  const user = await getCurrentUser();
  const now = new Date();

  const [measurements, rules, blackouts] = await Promise.all([
    store.listMeasurements({
      from: new Date(now.getTime() - 7 * 24 * 3600_000).toISOString(),
      to: new Date(now.getTime() + 30 * 24 * 3600_000).toISOString(),
    }),
    store.getMeasurementRules(),
    store.listBlackoutDates(),
  ]);

  const enriched = await Promise.all(
    measurements.map(async (measurement) => ({
      measurement,
      lead: await store.getLead(measurement.lead_id),
    })),
  );

  // Группируем по дням в часовом поясе замеров.
  const groups = new Map<string, typeof enriched>();
  for (const item of enriched) {
    const key = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Almaty',
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    }).format(new Date(item.measurement.starts_at));
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Замеры</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          Все даты и время — в часовом поясе Астаны (Asia/Almaty).
        </p>
      </div>

      {groups.size === 0 ? (
        <EmptyState
          title="Замеров нет"
          description="Записи появятся здесь, когда клиенты выберут время на странице «Запись на замер»."
        />
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([day, items]) => (
            <Card key={day} className="overflow-hidden">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-alt)] px-5 py-3">
                <p className="font-bold capitalize">{day}</p>
                <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                  {items.length} {items.length === 1 ? 'замер' : 'замера'}
                </p>
              </div>

              <ul className="divide-y divide-[var(--color-line)]">
                {items.map(({ measurement, lead }) => (
                  <li key={measurement.id} className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="font-bold">
                        {formatTime(measurement.starts_at)}
                        {lead ? ` · ${lead.name}` : ''}
                      </p>
                      <p className="mt-0.5 text-[0.875rem] text-[var(--color-ink-soft)]">
                        {[measurement.district, measurement.street, measurement.house, measurement.flat]
                          .filter(Boolean)
                          .join(', ') || 'Адрес уточняется'}
                      </p>
                      {lead ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-[0.8125rem] text-[var(--color-ink-muted)] hover:underline"
                        >
                          {formatPhone(lead.phone)}
                        </a>
                      ) : null}
                      {measurement.notes ? (
                        <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-muted)]">{measurement.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          measurement.status === 'confirmed'
                            ? 'success'
                            : measurement.status === 'done'
                              ? 'info'
                              : measurement.status === 'canceled'
                                ? 'neutral'
                                : 'warning'
                        }
                      >
                        {measurement.status === 'pending'
                          ? 'ждёт подтверждения'
                          : measurement.status === 'confirmed'
                            ? 'подтверждён'
                            : measurement.status === 'done'
                              ? 'выполнен'
                              : measurement.status === 'canceled'
                                ? 'отменён'
                                : 'перенесён'}
                      </Badge>

                      {measurement.status === 'pending' ? (
                        <InlineActionForm
                          action={measurementUpdateAction}
                          submitLabel="Подтвердить"
                          variant="primary"
                          hidden={{ measurement_id: measurement.id, status: 'confirmed' }}
                        />
                      ) : null}
                      {measurement.status === 'confirmed' ? (
                        <InlineActionForm
                          action={measurementUpdateAction}
                          submitLabel="Замер выполнен"
                          variant="outline"
                          hidden={{ measurement_id: measurement.id, status: 'done' }}
                        />
                      ) : null}
                      {measurement.status !== 'canceled' && measurement.status !== 'done' ? (
                        <InlineActionForm
                          action={measurementUpdateAction}
                          submitLabel="Отменить"
                          variant="ghost"
                          confirm="Отменить этот замер?"
                          hidden={{ measurement_id: measurement.id, status: 'canceled' }}
                        />
                      ) : null}

                      {lead ? (
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="text-[0.8125rem] font-semibold text-[var(--color-glass)] hover:underline"
                        >
                          Заявка #{lead.id}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Правила записи */}
      {user?.role === 'owner' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="font-bold">Расписание замеров</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
              Эти правила определяют, какие слоты видит клиент на странице записи.
            </p>

            <ActionForm action={measurementRulesAction} submitLabel="Сохранить расписание" className="mt-4">
              <div className="space-y-4">
                <fieldset className="space-y-2">
                  <legend className="text-[0.875rem] font-semibold">Рабочие дни</legend>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_LABELS.map((label, day) => (
                      <label
                        key={label}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-3 text-[0.875rem]"
                      >
                        <input
                          type="checkbox"
                          name={`weekday_${day}`}
                          defaultChecked={rules.weekdays.includes(day)}
                          className="size-4 accent-[var(--color-glass)]"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-start">Начало дня (час)</Label>
                    <Input
                      id="rules-start"
                      name="day_start"
                      type="number"
                      min={0}
                      max={23}
                      defaultValue={rules.dayStartMinutes / 60}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-end">Конец дня (час)</Label>
                    <Input
                      id="rules-end"
                      name="day_end"
                      type="number"
                      min={1}
                      max={24}
                      defaultValue={rules.dayEndMinutes / 60}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-slot">Длительность слота, мин</Label>
                    <Input id="rules-slot" name="slot_minutes" type="number" min={15} defaultValue={rules.slotMinutes} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-capacity">Бригад в один слот</Label>
                    <Input id="rules-capacity" name="capacity" type="number" min={1} defaultValue={rules.capacityPerSlot} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-min">Не раньше чем через, часов</Label>
                    <Input id="rules-min" name="min_lead_hours" type="number" min={0} defaultValue={rules.minLeadHours} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rules-horizon">Горизонт записи, дней</Label>
                    <Input id="rules-horizon" name="horizon_days" type="number" min={1} max={90} defaultValue={rules.horizonDays} />
                  </div>
                </div>
              </div>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <p className="font-bold">Закрытые даты</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
              Праздники и дни, когда выезды не выполняются. Клиенты не смогут записаться на эти даты.
            </p>

            <ActionForm action={blackoutAddAction} submitLabel="Закрыть дату" variant="outline" className="mt-4">
              <div className="space-y-1.5">
                <Label htmlFor="blackout-date">Дата</Label>
                <Input id="blackout-date" name="date" type="date" />
              </div>
            </ActionForm>

            {blackouts.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {blackouts.map((date) => (
                  <li key={date} className="flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] px-3 py-1.5 text-[0.8125rem]">
                    {date}
                    <InlineActionForm
                      action={blackoutRemoveAction}
                      submitLabel="×"
                      variant="ghost"
                      hidden={{ date }}
                      title="Открыть дату снова"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[0.8125rem] text-[var(--color-ink-muted)]">Закрытых дат нет.</p>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
