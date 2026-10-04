'use client';

import * as React from 'react';
import { CalendarCheck, CheckCircle2, Loader2, MessageCircle, Phone } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Alert, Badge, EmptyState } from '@/components/ui/feedback';
import { fieldError, useLeadSubmit } from '@/components/forms/use-lead-submit';
import { ASTANA_DISTRICTS, PRODUCT_TYPES } from '@/content/site';
import { formatTel } from '@/components/site/contact-types';
import { CONSENT_TEXT } from '@/lib/validation';
import { track } from '@/lib/tracking';
import { cn } from '@/lib/utils';

interface Slot {
  startsAt: string;
  label: string;
  available: boolean;
  free: number;
}

/**
 * Запись на замер (§8.3).
 *
 * Клиент выбирает слот из доступных. Без SMS-подтверждения это ЗАПРОС:
 * статус `pending`, менеджер подтверждает его кнопкой в Telegram. Поэтому текст
 * на странице честно говорит «подтвердим», а не «вы записаны».
 *
 * Слоты перепроверяются на сервере ещё раз при отправке: пока клиент заполнял
 * форму, место могло закончиться.
 */
export function MeasureForm({
  phonePrimary,
  whatsappPrimary,
  freeMeasureText,
}: {
  phonePrimary: string;
  whatsappPrimary: string;
  /** Подтверждённый текст про условия замера, либо нейтральная формулировка. */
  freeMeasureText: string;
}) {
  const { status, error, success, submit, reset } = useLeadSubmit('measurement');
  const [slots, setSlots] = React.useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = React.useState<string | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [startsAt, setStartsAt] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [district, setDistrict] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [house, setHouse] = React.useState('');
  const [flat, setFlat] = React.useState('');
  const [productType, setProductType] = React.useState('');
  const [comment, setComment] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/measurements/availability', { cache: 'no-store' });
        if (!response.ok) throw new Error('availability');
        const data = (await response.json()) as { slots: Slot[] };
        if (!cancelled) setSlots(data.slots ?? []);
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSlotsError('Не удалось загрузить свободное время. Позвоните нам — подберём удобный слот.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Группируем слоты по дню в часовом поясе Астаны.
  const days = React.useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots ?? []) {
      const key = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Asia/Almaty',
        day: 'numeric',
        month: 'long',
        weekday: 'short',
      }).format(new Date(slot.startsAt));
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [slots]);

  const activeDay = days.find(([key]) => key === selectedDate) ?? days[0];

  function validate(): boolean {
    const local: Record<string, string> = {};
    if (!startsAt) local.startsAt = 'Выберите дату и время';
    if (name.trim().length < 2) local.name = 'Как к вам обращаться?';
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Укажите номер телефона';
    if (!district) local.district = 'Выберите район';
    if (!productType) local.productType = 'Что нужно замерить?';
    if (!consent) local.consent = 'Отметьте согласие на обработку данных';
    setErrors(local);
    return Object.keys(local).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    await submit(
      {
        formType: 'measurement',
        name,
        phone,
        district,
        street: street || undefined,
        house: house || undefined,
        flat: flat || undefined,
        productType,
        startsAt,
        comment: comment || undefined,
        consent: true,
      },
      honeypot,
    );
  }

  if (status === 'success' && success) {
    return (
      <Alert tone="success" live className="flex-col gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-[var(--color-ink)]">Запрос на замер принят</p>
            <p className="mt-1 text-[var(--color-ink-soft)]">
              Мы подтвердим время по WhatsApp или звонком. Если удобнее сразу — напишите нам: подберём
              другой слот.
            </p>
            {success.leadId ? (
              <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">Номер заявки: №{success.leadId}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink
            href={success.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            variant="cta"
            size="sm"
            onClick={() => track('whatsapp_click', { place: 'measure_success' })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Уточнить в WhatsApp
          </ButtonLink>
          <ButtonLink href={`tel:${phonePrimary}`} variant="outline" size="sm">
            <Phone className="size-4" aria-hidden="true" />
            {formatTel(phonePrimary)}
          </ButtonLink>
        </div>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer self-start text-[0.8125rem] text-[var(--color-ink-muted)] underline underline-offset-2"
        >
          Записаться ещё раз
        </button>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" aria-label="Запись на замер">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-glass-soft)] bg-[var(--color-glass-soft)] p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-glass-deep)]">
          <CalendarCheck className="size-4" aria-hidden="true" />
          {freeMeasureText}
        </p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-glass-deep)]">
          Выберите удобное время — мы подтвердим его и приедем с образцами профилей.
        </p>
      </div>

      {status === 'error' && error ? (
        <Alert tone="danger" live>
          {error.message}
        </Alert>
      ) : null}

      {/* Выбор слота */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">
          Дата и время <span className="text-[var(--color-danger)]">*</span>
        </p>

        {slots === null ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Загружаем свободное время…
          </div>
        ) : null}

        {slotsError ? <Alert tone="warning">{slotsError}</Alert> : null}

        {slots && slots.length === 0 && !slotsError ? (
          <EmptyState
            title="Свободных слотов пока нет"
            description="Позвоните нам — подберём время вручную, даже если онлайн-запись занята."
            action={
              <ButtonLink href={`tel:${phonePrimary}`} variant="outline" size="sm">
                {formatTel(phonePrimary)}
              </ButtonLink>
            }
          />
        ) : null}

        {days.length > 0 ? (
          <>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Дни для записи">
              {days.map(([day, daySlots]) => {
                const isActive = activeDay?.[0] === day;
                const freeCount = daySlots.filter((slot) => slot.available).length;
                return (
                  <button
                    key={day}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setSelectedDate(day);
                      setStartsAt('');
                    }}
                    className={cn(
                      'min-h-12 shrink-0 cursor-pointer rounded-[var(--radius-md)] border px-3.5 py-2 text-left transition-colors',
                      isActive
                        ? 'border-[var(--color-glass)] bg-[var(--color-glass-soft)]'
                        : 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-glass)]',
                    )}
                  >
                    <span className="block text-[0.8125rem] font-semibold">{day}</span>
                    <span className="block text-[0.75rem] text-[var(--color-ink-muted)]">
                      {freeCount > 0 ? `${freeCount} свободно` : 'занято'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {activeDay?.[1].map((slot) => {
                const active = startsAt === slot.startsAt;
                const time = new Intl.DateTimeFormat('ru-RU', {
                  timeZone: 'Asia/Almaty',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(slot.startsAt));
                return (
                  <button
                    key={slot.startsAt}
                    type="button"
                    disabled={!slot.available}
                    aria-pressed={active}
                    onClick={() => {
                      setStartsAt(slot.startsAt);
                      setErrors((previous) => ({ ...previous, startsAt: '' }));
                    }}
                    className={cn(
                      'min-h-12 cursor-pointer rounded-[var(--radius-md)] border text-sm font-semibold transition-colors',
                      !slot.available && 'cursor-not-allowed border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[var(--color-ink-muted)] line-through',
                      slot.available && active && 'border-[var(--color-glass)] bg-[var(--color-glass)] text-white',
                      slot.available && !active && 'border-[var(--color-line-strong)] hover:border-[var(--color-glass)]',
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {errors.startsAt ? (
          <p role="alert" className="text-[0.8125rem] font-medium text-[var(--color-danger)]">
            {errors.startsAt}
          </p>
        ) : null}

        {startsAt ? (
          <Badge tone="info">
            Выбрано:{' '}
            {new Intl.DateTimeFormat('ru-RU', {
              timeZone: 'Asia/Almaty',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(startsAt))}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="measure-name" label="Ваше имя" required error={errors.name ?? fieldError(error, 'name')}>
          <Input
            autoComplete="name"
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field id="measure-phone" label="Телефон" required error={errors.phone ?? fieldError(error, 'phone')}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 700 000 00 00"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            invalid={Boolean(errors.phone)}
          />
        </Field>
        <Field id="measure-district" label="Район" required error={errors.district}>
          <Select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            invalid={Boolean(errors.district)}
          >
            <option value="">Выберите район</option>
            {ASTANA_DISTRICTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="measure-product" label="Что замерить" required error={errors.productType}>
          <Select
            value={productType}
            onChange={(event) => setProductType(event.target.value)}
            invalid={Boolean(errors.productType)}
          >
            <option value="">Выберите из списка</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Адрес</legend>
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          Достаточно улицы и дома — квартиру или офис уточним при подтверждении.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="measure-street" label="Улица" className="sm:col-span-1">
            <Input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Абая" />
          </Field>
          <Field id="measure-house" label="Дом">
            <Input value={house} onChange={(event) => setHouse(event.target.value)} placeholder="12" />
          </Field>
          <Field id="measure-flat" label="Кв. / офис">
            <Input value={flat} onChange={(event) => setFlat(event.target.value)} placeholder="45" />
          </Field>
        </div>
      </fieldset>

      <Field id="measure-comment" label="Комментарий" hint="Например: домофон не работает, звоните заранее">
        <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
      </Field>

      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="measure-company">Не заполняйте это поле</label>
        <input
          id="measure-company"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <Checkbox
        id="measure-consent"
        checked={consent}
        onChange={(event) => setConsent(event.target.checked)}
        error={errors.consent ?? fieldError(error, 'consent')}
        label={
          <>
            {CONSENT_TEXT}{' '}
            <a href="/politika" className="text-[var(--color-glass)] underline underline-offset-2">
              Политика конфиденциальности
            </a>
          </>
        }
      />

      <Button type="submit" variant="cta" size="lg" block loading={status === 'loading'}>
        {status === 'loading' ? 'Отправляем…' : 'Записаться на замер'}
      </Button>

      <p className="text-center text-[0.8125rem] text-[var(--color-ink-muted)]">
        Отменить или перенести замер можно в WhatsApp:{' '}
        <a
          href={`https://wa.me/${whatsappPrimary}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-glass)] underline underline-offset-2"
        >
          напишите нам
        </a>
        .
      </p>
    </form>
  );
}
