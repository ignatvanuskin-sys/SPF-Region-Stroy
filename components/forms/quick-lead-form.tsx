'use client';

import * as React from 'react';
import { CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/feedback';
import { fieldError, useLeadSubmit } from '@/components/forms/use-lead-submit';
import { PRODUCT_TYPES } from '@/content/site';
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from '@/lib/validation';
import { formatTel } from '@/components/site/contact-types';
import { track } from '@/lib/tracking';

export interface QuickLeadFormProps {
  /** Заголовок формы — на разных страницах он свой. */
  title?: string;
  description?: string;
  /** Предвыбранный тип конструкции (например, на странице услуги). */
  defaultProductType?: string;
  /** Откуда пришла форма: влияет только на аналитику и текст. */
  source?: 'quick' | 'service';
  serviceSlug?: string;
  phonePrimary: string;
  whatsappPrimary: string;
  className?: string;
}

/**
 * Быстрая заявка — главный конверсионный элемент сайта.
 *
 * Три поля, ничего лишнего: имя, телефон и что нужно. Всё остальное менеджер
 * уточнит при разговоре. Согласие на обработку данных — отдельный
 * неотмеченный чекбокс (§15), без него заявка не уходит.
 */
export function QuickLeadForm({
  title = 'Получить расчёт',
  description = 'Оставьте имя и телефон — менеджер свяжется и подготовит расчёт.',
  defaultProductType = '',
  source = 'quick',
  serviceSlug,
  phonePrimary,
  whatsappPrimary,
  className,
}: QuickLeadFormProps) {
  const { status, error, success, submit, reset } = useLeadSubmit('quick');
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [productType, setProductType] = React.useState(defaultProductType);
  const [comment, setComment] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState('');
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});

  const loading = status === 'loading';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientErrors({});

    // Быстрая проверка на клиенте: сервер всё равно проверит повторно.
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'Как к вам обращаться?';
    if (phone.replace(/\D/g, '').length < 10) local.phone = 'Укажите номер телефона';
    if (!productType) local.productType = 'Выберите, что вам нужно';
    if (!consent) local.consent = 'Отметьте согласие на обработку данных';
    if (Object.keys(local).length) {
      setClientErrors(local);
      return;
    }

    await submit(
      {
        formType: source,
        name,
        phone,
        productType,
        comment: comment || undefined,
        consent: true,
        serviceSlug,
      },
      honeypot,
    );
  }

  if (status === 'success' && success) {
    return (
      <div className={className}>
        <Alert tone="success" live className="flex-col gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--color-ink)]">
                {success.duplicate ? 'Заявка уже принята' : 'Заявка принята'}
              </p>
              <p className="mt-1 text-[var(--color-ink-soft)]">
                {success.duplicate
                  ? 'Мы видим ваше обращение и уже занимаемся им. Менеджер свяжется с вами.'
                  : 'Мы свяжемся с вами в рабочее время. Если хотите быстрее — напишите нам в WhatsApp.'}
              </p>
              {success.leadId ? (
                <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
                  Номер заявки: №{success.leadId}
                </p>
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
              onClick={() => track('whatsapp_click', { place: 'lead_success' })}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Написать в WhatsApp
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
            Отправить ещё одну заявку
          </button>
        </Alert>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={className}
      aria-label={title}
      data-consent-version={CONSENT_TEXT_VERSION}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-soft)]">{description}</p>
        </div>

        {status === 'error' && error ? (
          <Alert tone="danger" live>
            {error.message}
          </Alert>
        ) : null}

        <Field id="quick-name" label="Ваше имя" required error={clientErrors.name ?? fieldError(error, 'name')}>
          <Input
            name="name"
            autoComplete="name"
            enterKeyHint="next"
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(clientErrors.name)}
          />
        </Field>

        <Field
          id="quick-phone"
          label="Телефон"
          required
          hint="Позвоним или напишем в WhatsApp — как удобнее"
          error={clientErrors.phone ?? fieldError(error, 'phone')}
        >
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="next"
            placeholder="+7 700 000 00 00"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            invalid={Boolean(clientErrors.phone)}
          />
        </Field>

        <Field
          id="quick-product"
          label="Что нужно"
          required
          error={clientErrors.productType ?? fieldError(error, 'productType')}
        >
          <Select
            name="productType"
            value={productType}
            onChange={(event) => setProductType(event.target.value)}
            invalid={Boolean(clientErrors.productType)}
          >
            <option value="">Выберите из списка</option>
            {PRODUCT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="quick-comment" label="Комментарий" hint="Необязательно">
          <Input
            name="comment"
            placeholder="Например: нужно 2 окна на кухню"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Field>

        {/* Honeypot: люди его не видят, боты заполняют и отсеиваются. */}
        <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="quick-company">Не заполняйте это поле</label>
          <input
            id="quick-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <Checkbox
          id="quick-consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          error={clientErrors.consent ?? fieldError(error, 'consent')}
          label={
            <>
              {CONSENT_TEXT}{' '}
              <a href="/politika" className="text-[var(--color-glass)] underline underline-offset-2">
                Политика конфиденциальности
              </a>
            </>
          }
        />

        <Button type="submit" variant="cta" size="lg" block loading={loading}>
          {loading ? 'Отправляем…' : 'Получить расчёт'}
        </Button>

        <p className="text-center text-[0.8125rem] text-[var(--color-ink-muted)]">
          Стоимость рассчитает менеджер после уточнения параметров или замера.
        </p>
      </div>
    </form>
  );
}
