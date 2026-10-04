'use client';

import * as React from 'react';
import { CheckCircle2, Paperclip, Phone, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/feedback';
import { fieldError, useLeadSubmit } from '@/components/forms/use-lead-submit';
import { PRODUCT_TYPES } from '@/content/site';
import { formatTel } from '@/components/site/contact-types';
import { CONSENT_TEXT } from '@/lib/validation';
import { track } from '@/lib/tracking';

const OBJECT_TYPES = [
  'Жилой дом / коттедж',
  'Магазин или торговая точка',
  'Офис',
  'Кафе / ресторан',
  'СТО / производственное помещение',
  'Многоквартирный дом (застройщик)',
  'Другое',
];

/**
 * Запрос для организаций и застройщиков (§6.4).
 *
 * Заявка идёт в тот же поток, но с меткой `segment=b2b` и повышенным
 * приоритетом в Telegram — владелец видит её первой.
 *
 * Чертежи и спецификации: файл сначала уходит на `/api/uploads`, который
 * проверяет тип и размер (PDF/JPG/PNG/WebP/DWG/DXF, до 15 МБ), и только потом
 * в заявку попадает ключ. Оригинальное имя файла в пути не используется.
 */
export function B2BForm({
  phonePrimary,
  whatsappPrimary,
}: {
  phonePrimary: string;
  whatsappPrimary: string;
}) {
  const { status, error, success, submit, reset } = useLeadSubmit('b2b');
  const [organization, setOrganization] = React.useState('');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [objectType, setObjectType] = React.useState('');
  const [productType, setProductType] = React.useState('other');
  const [volume, setVolume] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  const [comment, setComment] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [file, setFile] = React.useState<{ key: string; name: string; size: number } | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFileError(null);

    if (selected.size > 15 * 1024 * 1024) {
      setFileError('Файл больше 15 МБ. Пришлите его в WhatsApp — так быстрее.');
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', selected);
      const response = await fetch('/api/uploads', { method: 'POST', body });
      const data = (await response.json().catch(() => ({}))) as {
        key?: string;
        name?: string;
        size?: number;
        error?: { message: string };
      };
      if (!response.ok || !data.key) {
        setFileError(data.error?.message ?? 'Не удалось загрузить файл. Пришлите его в WhatsApp.');
        return;
      }
      setFile({ key: data.key, name: data.name ?? selected.name, size: data.size ?? selected.size });
      track('file_uploaded', { form: 'b2b', size: data.size ?? selected.size });
    } catch {
      setFileError('Не удалось загрузить файл. Пришлите его в WhatsApp.');
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const local: Record<string, string> = {};
    if (organization.trim().length < 2) local.organization = 'Укажите название организации';
    if (name.trim().length < 2) local.name = 'Укажите контактное лицо';
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Укажите телефон';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) local.email = 'Проверьте e-mail';
    if (!consent) local.consent = 'Отметьте согласие на обработку данных';
    setErrors(local);
    return Object.keys(local).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    await submit(
      {
        formType: 'b2b',
        organization,
        name,
        phone,
        email: email || undefined,
        objectType: objectType || undefined,
        productType,
        volume: volume || undefined,
        deadline: deadline || undefined,
        comment: comment || undefined,
        fileName: file?.name,
        fileKey: file?.key,
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
            <p className="font-semibold text-[var(--color-ink)]">Запрос отправлен</p>
            <p className="mt-1 text-[var(--color-ink-soft)]">
              Заявки от организаций мы обрабатываем в первую очередь. Менеджер свяжется с вами и
              подготовит расчёт по вашей спецификации.
            </p>
            {success.leadId ? (
              <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">Номер заявки: №{success.leadId}</p>
            ) : null}
          </div>
        </div>
        <ButtonLink href={`tel:${phonePrimary}`} variant="outline" size="sm" className="self-start">
          <Phone className="size-4" aria-hidden="true" />
          {formatTel(phonePrimary)}
        </ButtonLink>
        <button
          type="button"
          onClick={() => {
            reset();
            setFile(null);
          }}
          className="cursor-pointer self-start text-[0.8125rem] text-[var(--color-ink-muted)] underline underline-offset-2"
        >
          Отправить ещё один запрос
        </button>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Запрос для организаций">
      {status === 'error' && error ? (
        <Alert tone="danger" live>
          {error.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="b2b-org"
          label="Организация"
          required
          error={errors.organization ?? fieldError(error, 'organization')}
        >
          <Input
            autoComplete="organization"
            placeholder="ТОО «Пример»"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            invalid={Boolean(errors.organization)}
          />
        </Field>
        <Field id="b2b-name" label="Контактное лицо" required error={errors.name ?? fieldError(error, 'name')}>
          <Input
            autoComplete="name"
            placeholder="Имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field id="b2b-phone" label="Телефон" required error={errors.phone ?? fieldError(error, 'phone')}>
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
        <Field id="b2b-email" label="E-mail" error={errors.email ?? fieldError(error, 'email')}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="zakup@example.kz"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={Boolean(errors.email)}
          />
        </Field>
        <Field id="b2b-object" label="Тип объекта">
          <Select value={objectType} onChange={(event) => setObjectType(event.target.value)}>
            <option value="">Выберите</option>
            {OBJECT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b2b-product" label="Что интересует">
          <Select value={productType} onChange={(event) => setProductType(event.target.value)}>
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="b2b-volume" label="Ориентировочный объём" hint="Количество конструкций или м²">
          <Input value={volume} onChange={(event) => setVolume(event.target.value)} placeholder="например, 40 окон" />
        </Field>
        <Field id="b2b-deadline" label="Желаемые сроки">
          <Input value={deadline} onChange={(event) => setDeadline(event.target.value)} placeholder="до конца квартала" />
        </Field>
      </div>

      {/* Загрузка спецификации или чертежа */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Спецификация или чертёж</p>
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          PDF, JPG, PNG, WebP, DWG или DXF — до 15 МБ. Если файл больше, пришлите его в WhatsApp.
        </p>

        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3.5 py-3">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <Paperclip className="size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-[var(--color-ink-muted)]">
                {(file.size / 1024 / 1024).toFixed(1)} МБ
              </span>
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="cursor-pointer rounded-full p-2 text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-alt)]"
              aria-label="Удалить файл"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <label
            className="flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] px-4 text-sm font-medium transition-colors hover:border-[var(--color-glass)]"
            aria-disabled={uploading}
          >
            <Paperclip className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
            {uploading ? 'Загружаем файл…' : 'Прикрепить файл'}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.dwg,.dxf"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        )}

        {fileError ? (
          <p role="alert" className="text-[0.8125rem] font-medium text-[var(--color-danger)]">
            {fileError}
          </p>
        ) : null}
      </div>

      <Field id="b2b-comment" label="Комментарий" hint="Адрес объекта, особенности, кто принимает решение">
        <Textarea value={comment} onChange={(event) => setComment(event.target.value)} />
      </Field>

      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="b2b-company">Не заполняйте это поле</label>
        <input
          id="b2b-company"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <Checkbox
        id="b2b-consent"
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
        {status === 'loading' ? 'Отправляем…' : 'Отправить запрос'}
      </Button>

      <p className="text-center text-[0.8125rem] text-[var(--color-link-muted,var(--color-ink-muted))]">
        Нужно срочно? Позвоните{' '}
        <a href={`tel:${phonePrimary}`} className="whitespace-nowrap text-[var(--color-glass)] underline underline-offset-2">
          {formatTel(phonePrimary)}
        </a>{' '}
        или напишите в{' '}
        <a
          href={`https://wa.me/${whatsappPrimary}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-glass)] underline underline-offset-2"
        >
          WhatsApp
        </a>
        .
      </p>
    </form>
  );
}
