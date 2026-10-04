import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, MessageCircle, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, Badge, EmptyState } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/form-controls';
import { ActionForm, InlineActionForm } from '@/components/admin/action-form';
import {
  leadAssignAction,
  leadDeleteAction,
  leadNoteAction,
  leadStatusAction,
} from '@/app/admin/actions';
import { getStore } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import {
  LOST_REASONS,
  LOST_REASON_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  canTransition,
} from '@/lib/domain/statuses';
import { sourceLabel } from '@/lib/domain/attribution';
import { PRODUCT_TYPE_LABELS } from '@/content/site';
import { LEAD_EVENT_LABELS } from '@/lib/domain/statuses';
import { formatDateTime, formatDuration } from '@/lib/utils';
import { formatPhone, phoneToWaId } from '@/lib/phone';
import { measureConfirmationText, reviewRequestText, summarizeCalc, whatsappLink } from '@/lib/notify/templates';
import { getSiteConfig } from '@/lib/domain/settings';
import { leadDeliveryState } from '@/lib/domain/notifications';

export const dynamic = 'force-dynamic';

/**
 * Карточка заявки (§9.2).
 *
 * Здесь всё, что нужно менеджеру для звонка: контакты, конфигурация из
 * калькулятора, вложения, история и заметки. Кнопки звонка и WhatsApp — с
 * предзаполненным текстом, чтобы не набирать вручную.
 */
export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isFinite(leadId)) notFound();

  const store = getStore();
  const lead = await store.getLead(leadId);
  if (!lead) notFound();

  const [events, files, measurements, staff, user, config, delivery] = await Promise.all([
    store.listLeadEvents(leadId),
    store.listLeadFiles(leadId),
    store.listMeasurementsByLead(leadId),
    store.listStaff(true),
    getCurrentUser(),
    getSiteConfig(),
    leadDeliveryState(leadId),
  ]);

  const calc = lead.calc_payload as Record<string, any> | null;
  const allowedStatuses = LEAD_STATUSES.filter((status) => canTransition(lead.status, status));
  const responseTime = lead.first_response_at
    ? formatDuration(new Date(lead.first_response_at).getTime() - new Date(lead.created_at).getTime())
    : null;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-glass)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Все заявки
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Заявка #{lead.id}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={LEAD_STATUS_TONE[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge>
            {lead.segment === 'b2b' ? <Badge tone="progress">Организация</Badge> : null}
            {lead.priority === 'high' ? <Badge tone="cta">Срочно</Badge> : null}
            <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
              получена {formatDateTime(lead.created_at)}
            </span>
            {responseTime ? (
              <span className="text-[0.8125rem] text-[var(--color-ink-muted)]">
                · реакция за {responseTime}
              </span>
            ) : (
              <span className="text-[0.8125rem] font-semibold text-[var(--color-danger)]">
                · реакция ещё не зафиксирована
              </span>
            )}
          </div>
        </div>
      </div>

      {!delivery.delivered ? (
        <Alert tone="danger">
          Уведомление менеджеру не доставлено{delivery.lastError ? `: ${delivery.lastError}` : ''}. Заявка
          сохранена — позвоните клиенту вручную.{' '}
          <Link href="/admin/notifications" className="font-semibold underline underline-offset-2">
            Журнал уведомлений
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ---------------- основная колонка ---------------- */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Клиент
            </p>
            <p className="mt-2 text-lg font-bold">{lead.name}</p>

            <div className="mt-3 space-y-1.5 text-[0.9375rem]">
              <a href={`tel:${lead.phone}`} className="block font-semibold hover:text-[var(--color-glass)]">
                {formatPhone(lead.phone)}
              </a>
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="block break-anywhere text-[var(--color-ink-soft)] hover:text-[var(--color-glass)]">
                  {lead.email}
                </a>
              ) : null}
              {lead.district ? <p className="text-[var(--color-ink-soft)]">Район: {lead.district}</p> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href={`tel:${lead.phone}`} variant="primary" size="sm">
                <Phone className="size-4" aria-hidden="true" />
                Позвонить
              </ButtonLink>
              <ButtonLink
                href={whatsappLink(
                  phoneToWaId(lead.phone),
                  `Здравствуйте, ${lead.name}! Пишу по вашей заявке №${lead.id} с сайта.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                WhatsApp
              </ButtonLink>
            </div>

            {lead.comment ? (
              <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5">
                <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Комментарий клиента
                </p>
                <p className="mt-1.5 text-[0.9375rem] whitespace-pre-line">{lead.comment}</p>
              </div>
            ) : null}
          </Card>

          {/* Конфигурация калькулятора */}
          {calc ? (
            <Card className="p-5">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                Конфигурация из калькулятора
              </p>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {[
                  ['Что нужно', PRODUCT_TYPE_LABELS[lead.product_type ?? ''] ?? '—'],
                  ['Размер', calc.widthMm && calc.heightMm ? `${calc.widthMm} × ${calc.heightMm} мм` : '—'],
                  ['Створок', calc.sections ?? '—'],
                  ['Тип открывания', calc.opening ?? '—'],
                  ['Количество', calc.quantity ?? '—'],
                  ['Стеклопакет', calc.glazing ?? '—'],
                  ['Цвет', calc.color ?? '—'],
                  ['Монтаж', calc.needInstall === false ? 'не нужен' : 'нужен'],
                  ['Доставка', calc.needDelivery === false ? 'не нужна' : 'нужна'],
                  ['Сроки', calc.desiredTiming ?? '—'],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-4 border-b border-[var(--color-line)] py-1.5 last:border-0">
                    <dt className="text-[0.875rem] text-[var(--color-ink-muted)]">{label}</dt>
                    <dd className="text-right text-[0.875rem] font-medium">{String(value)}</dd>
                  </div>
                ))}
              </dl>
              {Array.isArray(calc.options) && calc.options.length > 0 ? (
                <p className="mt-3 text-[0.875rem] text-[var(--color-ink-soft)]">
                  Дополнительно: {calc.options.join(', ')}
                </p>
              ) : null}
              <p className="mt-3 text-[0.75rem] text-[var(--color-ink-muted)]">
                Кратко для звонка: {summarizeCalc(calc) ?? '—'}
              </p>
            </Card>
          ) : null}

          {/* Атрибуция */}
          <Card className="p-5">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              Источник
            </p>
            <dl className="mt-3 space-y-2 text-[0.875rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Канал</dt>
                <dd className="font-medium">{sourceLabel(lead.source)}</dd>
              </div>
              {lead.request_path ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-muted)]">Страница заявки</dt>
                  <dd className="font-medium break-anywhere">{lead.request_path}</dd>
                </div>
              ) : null}
              {lead.landing_path ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-muted)]">Первая страница</dt>
                  <dd className="font-medium break-anywhere">{lead.landing_path}</dd>
                </div>
              ) : null}
              {lead.referrer ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-muted)]">Referrer</dt>
                  <dd className="font-medium break-anywhere text-right">{lead.referrer}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-ink-muted)]">Устройство</dt>
                <dd className="font-medium">{lead.device ?? '—'}</dd>
              </div>
              {lead.utm
                ? Object.entries(lead.utm).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-[var(--color-ink-muted)]">{key}</dt>
                      <dd className="font-medium break-anywhere">{value}</dd>
                    </div>
                  ))
                : null}
            </dl>
          </Card>

          {/* Вложения */}
          {files.length > 0 ? (
            <Card className="p-5">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                Вложения
              </p>
              <ul className="mt-3 space-y-2">
                {files.map((file) => (
                  <li key={file.id}>
                    <a
                      href={`/api/admin/files/${file.storage_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[0.875rem] text-[var(--color-glass)] hover:underline"
                    >
                      <FileText className="size-4" aria-hidden="true" />
                      {file.original_name}
                      <span className="text-[var(--color-ink-muted)]">
                        ({(file.size / 1024 / 1024).toFixed(1)} МБ)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* Замеры */}
          {measurements.length > 0 ? (
            <Card className="p-5">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                Замеры по заявке
              </p>
              <ul className="mt-3 space-y-3">
                {measurements.map((measurement) => (
                  <li key={measurement.id} className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3.5">
                    <p className="font-semibold">{formatDateTime(measurement.starts_at)}</p>
                    <p className="text-[0.8125rem] text-[var(--color-ink-soft)]">
                      {[measurement.district, measurement.street, measurement.house, measurement.flat]
                        .filter(Boolean)
                        .join(', ') || 'Адрес уточняется'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        tone={
                          measurement.status === 'confirmed'
                            ? 'success'
                            : measurement.status === 'done'
                              ? 'info'
                              : 'warning'
                        }
                      >
                        {measurement.status === 'pending'
                          ? 'не подтверждён'
                          : measurement.status === 'confirmed'
                            ? 'подтверждён'
                            : measurement.status === 'done'
                              ? 'выполнен'
                              : measurement.status}
                      </Badge>
                      <ButtonLink
                        href={whatsappLink(
                          phoneToWaId(lead.phone),
                          measureConfirmationText(lead, measurement, config.phonePrimary),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="ghost"
                        size="sm"
                      >
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Подтвердить в WhatsApp
                      </ButtonLink>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* История */}
          <Card className="p-5">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              История
            </p>
            {events.length === 0 ? (
              <p className="mt-3 text-[0.875rem] text-[var(--color-ink-muted)]">Событий пока нет.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="border-l-2 border-[var(--color-line)] pl-3.5">
                    <p className="text-[0.875rem] font-medium">
                      {LEAD_EVENT_LABELS[event.type] ?? event.type}
                    </p>
                    <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                      {formatDateTime(event.created_at)}
                      {event.actor_label ? ` · ${event.actor_label}` : ''}
                    </p>
                    {event.type === 'commented' && (event.payload as any)?.text ? (
                      <p className="mt-1 text-[0.875rem] text-[var(--color-ink-soft)]">
                        {(event.payload as any).text}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* ---------------- боковая колонка ---------------- */}
        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-bold">Статус</p>
            <div className="mt-3 space-y-3">
              <ActionForm action={leadStatusAction} submitLabel="Сменить статус" hidden={{ lead_id: lead.id }}>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-status">Новый статус</Label>
                    <Select id="lead-status" name="status" defaultValue={lead.status}>
                      {allowedStatuses.map((status) => (
                        <option key={status} value={status}>
                          {LEAD_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lead-lost">Причина отказа</Label>
                    <Select id="lead-lost" name="lost_reason" defaultValue={lead.lost_reason ?? ''}>
                      <option value="">— не отказ —</option>
                      {LOST_REASONS.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </Select>
                    <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                      Обязательна, если выбран статус «Отказ».
                    </p>
                  </div>
                </div>
              </ActionForm>
              {lead.lost_reason ? (
                <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Причина отказа: {LOST_REASON_LABELS[lead.lost_reason] ?? lead.lost_reason}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-bold">Ответственный</p>
            <ActionForm
              action={leadAssignAction}
              submitLabel="Назначить"
              variant="outline"
              hidden={{ lead_id: lead.id }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="lead-assignee">Сотрудник</Label>
                <Select id="lead-assignee" name="staff_id" defaultValue={lead.assignee_id ?? ''}>
                  <option value="">Не назначен</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </div>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <p className="font-bold">Заметка</p>
            <ActionForm
              action={leadNoteAction}
              submitLabel="Добавить заметку"
              variant="outline"
              hidden={{ lead_id: lead.id }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="lead-note">Текст</Label>
                <Textarea
                  id="lead-note"
                  name="note"
                  placeholder="Договорились на звонок в 15:00"
                  className="min-h-20"
                />
              </div>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <p className="font-bold">Просьба об отзыве</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
              Отправляйте после монтажа. Сообщение уходит от вас, а не от бота — так соблюдаются
              правила WhatsApp.
            </p>
            <ButtonLink
              href={whatsappLink(phoneToWaId(lead.phone), reviewRequestText(lead, config.gisReviews))}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Открыть WhatsApp
            </ButtonLink>
          </Card>

          {user?.role === 'owner' ? (
            <Card className="border-[#f3c6c2] p-5">
              <p className="font-bold text-[var(--color-danger)]">Удаление данных клиента</p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                Удаляет заявку, вложения, замеры и историю. Действие необратимо. Используйте по
                запросу клиента на удаление персональных данных.
              </p>
              <div className="mt-3">
                <ActionForm
                  action={leadDeleteAction}
                  submitLabel="Удалить данные"
                  variant="danger"
                  hidden={{ lead_id: lead.id }}
                  confirm="Удалить заявку, вложения и историю безвозвратно?"
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          title="Сотрудники не добавлены"
          description="Пока в системе нет сотрудников, заявки уходят в общий Telegram-чат. Добавьте сотрудников в разделе «Настройки», чтобы назначать ответственных."
        />
      ) : null}
    </div>
  );
}
