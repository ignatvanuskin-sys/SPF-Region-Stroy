'use client';

import * as React from 'react';
import { attributionFields, track } from '@/lib/tracking';

/**
 * Общая логика отправки любой формы сайта (§8.1).
 *
 * Что берёт на себя хук:
 *  • `submissionId` — генерируется один раз на монтирование. Повторная отправка
 *    той же формы (двойной клик, «назад» и снова «отправить») не создаёт дубль,
 *    потому что сервер видит тот же UUID;
 *  • `elapsedMs` — время заполнения формы, простой признак бота;
 *  • скрытый honeypot;
 *  • атрибуцию (src/UTM/referrer) — из localStorage, а не из реквизитов формы;
 *  • разбор ошибок сервера в понятный текст и подсветку конкретного поля;
 *  • состояние загрузки и повторную попытку без потери введённых данных.
 */

export type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SubmitError {
  code: string;
  message: string;
  field?: string;
}

export interface SuccessInfo {
  leadId: number;
  duplicate: boolean;
  whatsappHref: string;
  /** Полный ответ сервера: например, `price` в режиме range. */
  raw: Record<string, unknown>;
}

interface ApiResponse {
  ok?: boolean;
  leadId?: number;
  duplicate?: boolean;
  whatsappHref?: string;
  error?: { code: string; message: string; field?: string };
}

export function useLeadSubmit(formName: string) {
  const [status, setStatus] = React.useState<SubmitStatus>('idle');
  const [error, setError] = React.useState<SubmitError | null>(null);
  const [success, setSuccess] = React.useState<SuccessInfo | null>(null);
  const submissionIdRef = React.useRef<string>('');
  const startedAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    startedAtRef.current = Date.now();
    try {
      submissionIdRef.current = crypto.randomUUID();
    } catch {
      submissionIdRef.current = `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  /** Поля, которые всегда добавляем к телу заявки. */
  const buildEnvelope = React.useCallback((honeypot: string) => {
    return {
      submissionId: submissionIdRef.current,
      elapsedMs: Date.now() - startedAtRef.current,
      honeypot,
      ...attributionFields(),
    };
  }, []);

  const submit = React.useCallback(
    async (body: Record<string, unknown>, honeypot = '') => {
      setStatus('loading');
      setError(null);

      try {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, ...buildEnvelope(honeypot) }),
        });

        const data = (await response.json().catch(() => ({}))) as ApiResponse;

        if (!response.ok) {
          setError({
            code: data.error?.code ?? 'unknown',
            message:
              data.error?.message ??
              'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.',
            field: data.error?.field,
          });
          setStatus('error');
          track('lead_error', { form: formName, code: data.error?.code ?? 'unknown' });
          return null;
        }

        const info: SuccessInfo = {
          leadId: data.leadId ?? 0,
          duplicate: Boolean(data.duplicate),
          whatsappHref: data.whatsappHref ?? 'https://wa.me/',
          raw: data as unknown as Record<string, unknown>,
        };
        setSuccess(info);
        setStatus('success');
        track('lead_submit', { form: formName, duplicate: info.duplicate, leadId: info.leadId });
        return info;
      } catch {
        setError({
          code: 'network',
          message:
            'Нет связи с сервером. Данные сохранены в форме — попробуйте ещё раз или позвоните нам.',
        });
        setStatus('error');
        track('lead_error', { form: formName, code: 'network' });
        return null;
      }
    },
    [buildEnvelope, formName],
  );

  /** Сброс к исходному состоянию, если пользователь хочет отправить ещё одну заявку. */
  const reset = React.useCallback(() => {
    setStatus('idle');
    setError(null);
    setSuccess(null);
    startedAtRef.current = Date.now();
    try {
      submissionIdRef.current = crypto.randomUUID();
    } catch {
      submissionIdRef.current = `fallback-${Date.now()}`;
    }
  }, []);

  return { status, error, success, submit, reset, setStatus, setError };
}

/** Поле ошибки для конкретного поля — удобно подставлять в <Field error={...}>. */
export function fieldError(error: SubmitError | null, field: string): string | null {
  return error && error.field === field ? error.message : null;
}
