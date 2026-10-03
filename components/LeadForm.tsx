'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { NOTES } from '@/content/notes';
import { CONTACTS } from '@/content/contacts';
import { MarkerText } from '@/components/MarkerText';
import { waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { utmForLead } from '@/lib/utm';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_COMMENT,
  MAX_FILES,
  MAX_FILE_SIZE,
  NEEDS,
  OBJECT_TYPES,
  PHONE_ERROR_TEXT,
  formatPhoneInput,
  normalizePhone,
} from '@/lib/validation';

type Mode = 'quick' | 'details';
type Status = 'idle' | 'sending' | 'success' | 'server_error' | 'not_configured' | 'offline';

interface ServiceEvent {
  service: string;
  mode?: 'quote' | 'measure';
}

/**
 * Якорь #zayavka живёт на обёртке страницы, а не здесь: форма подгружается
 * лениво и её узел появляется позже. Дублировать id нельзя (a11y).
 */
export function LeadForm({
  id,
  variant = 'full',
  initialService = '',
  initialMode = 'quote',
}: {
  id?: string;
  variant?: 'full' | 'quick';
  initialService?: string;
  initialMode?: 'quote' | 'measure';
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  const [expanded, setExpanded] = useState(variant === 'full' && initialMode === 'measure');
  const [needs, setNeeds] = useState<string>(
    initialMode === 'measure' ? 'Вызвать замерщика' : '',
  );
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);

  const [objectType, setObjectType] = useState('');
  const [service, setService] = useState(initialService);
  const [count, setCount] = useState('');
  const [sizes, setSizes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [address, setAddress] = useState('');
  const [contactWay, setContactWay] = useState<'whatsapp' | 'call' | ''>('');
  const [comment, setComment] = useState('');

  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);

  const isMeasure = needs === 'Вызвать замерщика' || initialMode === 'measure';

  /* Подстановка услуги из карточек-сценариев. */
  useEffect(() => {
    const onService = (event: Event) => {
      const detail = (event as CustomEvent<ServiceEvent>).detail;
      if (!detail?.service) return;
      setService(detail.service);
      setNeeds((prev) => prev || mapServiceToNeed(detail.service));
      if (detail.mode === 'measure') setNeeds('Вызвать замерщика');
      setExpanded(true);
    };
    window.addEventListener('spf:service', onService);
    return () => window.removeEventListener('spf:service', onService);
  }, []);

  const onFirstInput = useCallback(() => {
    if (started) return;
    setStarted(true);
    track('form_start', { form: expanded ? 'details' : 'quick', service: service || undefined });
  }, [started, expanded, service]);

  const accept = useMemo(() => ACCEPTED_IMAGE_TYPES.join(','), []);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    const accepted: File[] = [];
    const nextErrors: Record<string, string> = {};

    for (const file of incoming) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        nextErrors.photos = 'Можно приложить только изображения (JPG, PNG, WebP, HEIC).';
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextErrors.photos = 'Каждый файл — до 10 МБ.';
        continue;
      }
      accepted.push(file);
    }

    const merged = [...files, ...accepted].slice(0, MAX_FILES);
    if (files.length + accepted.length > MAX_FILES) {
      nextErrors.photos = `Не больше ${MAX_FILES} файлов.`;
    }
    setFiles(merged);
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (accepted.length > 0) track('file_attached', { count: merged.length });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!needs) next.needs = 'Выберите, что вам нужно';
    if (!normalizePhone(phone)) next.phone = PHONE_ERROR_TEXT;
    if (!consent) next.consent = 'Нужно согласие на обработку персональных данных';
    if (files.length > MAX_FILES) next.photos = `Не больше ${MAX_FILES} файлов.`;
    if (comment.length > MAX_COMMENT) next.comment = `Не больше ${MAX_COMMENT} символов.`;
    return next;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    setErrors(found);

    if (Object.keys(found).length > 0) {
      track('form_error', {
        form: expanded ? 'details' : 'quick',
        reason: Object.keys(found)[0],
      });
      return;
    }

    const formMode: Mode = expanded || files.length > 0 || sizes || address ? 'details' : 'quick';
    setStatus('sending');
    track('form_submit', { form: formMode, service: service || undefined });

    const body = new FormData();
    body.set('mode', formMode);
    body.set('needs', needs);
    body.set('phone', phone);
    body.set('name', name);
    body.set('consent', consent ? 'true' : '');
    body.set('website', ''); // поле-ловушка, всегда пустое у человека
    if (objectType) body.set('objectType', objectType);
    if (service) body.set('service', service);
    if (count) body.set('count', count);
    if (sizes) body.set('sizes', sizes);
    if (address) body.set('address', address);
    if (contactWay) body.set('contactWay', contactWay);
    if (comment) body.set('comment', comment);
    body.set('page', window.location.pathname);
    body.set('utm', utmForLead());
    files.forEach((file) => body.append('photos', file));

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('offline');
      track('form_error', { form: formMode, reason: 'offline' });
      return;
    }

    try {
      const res = await fetch('/api/lead', { method: 'POST', body });

      if (res.status === 503) {
        // Бэкенд не настроен — честная плашка, никакой имитации успеха.
        setStatus('not_configured');
        track('form_error', { form: formMode, reason: 'not_configured' });
        return;
      }

      if (res.status === 429) {
        setStatus('server_error');
        track('form_error', { form: formMode, reason: 'rate_limited' });
        return;
      }

      if (!res.ok) {
        setStatus('server_error');
        track('form_error', { form: formMode, reason: `http_${res.status}` });
        return;
      }

      // Успех — ТОЛЬКО после ответа сервера 200.
      setStatus('success');
      track('form_success', { form: formMode, service: service || undefined });
      router.push('/spasibo');
    } catch {
      setStatus('offline');
      track('form_error', { form: formMode, reason: 'network' });
    }
  }

  const sending = status === 'sending';

  return (
    <div className="card p-5 md:p-8" id={id}>
      <form ref={formRef} onSubmit={onSubmit} noValidate aria-describedby={`${uid}-note`}>
        {/* Поле-ловушка: скрыто от людей */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <fieldset>
          <legend className="field-label">Что нужно *</legend>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={needs === item}
                data-selected={needs === item}
                onClick={() => {
                  onFirstInput();
                  setNeeds(item);
                  if (item === 'Вызвать замерщика') setExpanded(true);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          {errors.needs && (
            <span className="field-error" role="alert">
              {errors.needs}
            </span>
          )}
        </fieldset>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label" htmlFor={`${uid}-phone`}>
              Телефон *
            </label>
            <input
              id={`${uid}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              className="field tnum"
              placeholder="+7 701 000 00 00"
              value={phone}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${uid}-phone-error` : undefined}
              onFocus={onFirstInput}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            />
            {errors.phone && (
              <span className="field-error" id={`${uid}-phone-error`} role="alert">
                {errors.phone}
              </span>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor={`${uid}-name`}>
              Имя
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              type="text"
              autoComplete="given-name"
              className="field"
              value={name}
              onFocus={onFirstInput}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Раскрытие «Добавить размеры и фото» (11.2) */}
        <div className="mt-4">
          <button
            type="button"
            className="text-[15px] font-medium text-[color:var(--accent)] underline underline-offset-2"
            aria-expanded={expanded}
            aria-controls={`${uid}-details`}
            onClick={() => {
              setExpanded((v) => !v);
              onFirstInput();
            }}
          >
            {expanded ? 'Скрыть размеры и фото' : 'Добавить размеры и фото'}
          </button>
        </div>

        <div id={`${uid}-details`} hidden={!expanded} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor={`${uid}-object`}>
                Тип объекта
              </label>
              <select
                id={`${uid}-object`}
                className="field"
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
              >
                <option value="">Не выбрано</option>
                {OBJECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor={`${uid}-count`}>
                Примерное количество окон / конструкций
              </label>
              <input
                id={`${uid}-count`}
                className="field tnum"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor={`${uid}-sizes`}>
              Размеры, если известны
            </label>
            <input
              id={`${uid}-sizes`}
              className="field"
              placeholder="Например: 1400×1300 мм, 2 шт."
              value={sizes}
              onChange={(e) => setSizes(e.target.value.slice(0, 400))}
            />
          </div>

          <div>
            <label className="field-label" htmlFor={`${uid}-files`}>
              Фото (до {MAX_FILES} файлов, до 10 МБ каждый)
            </label>
            <input
              id={`${uid}-files`}
              type="file"
              accept={`${accept},image/*`}
              multiple
              className="field py-3"
              onChange={(e) => addFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-[14px] text-[color:var(--ink-2)]">
                {files.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      className="text-[color:var(--error)] underline"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.photos && (
              <span className="field-error" role="alert">
                {errors.photos}
              </span>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor={`${uid}-address`}>
              Адрес объекта
            </label>
            <input
              id={`${uid}-address`}
              className="field"
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 240))}
            />
          </div>

          <fieldset>
            <legend className="field-label">Удобный способ связи</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['whatsapp', 'WhatsApp'],
                  ['call', 'Звонок'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={contactWay === value}
                  data-selected={contactWay === value}
                  onClick={() => setContactWay(contactWay === value ? '' : value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="field-label" htmlFor={`${uid}-comment`}>
              Комментарий
            </label>
            <textarea
              id={`${uid}-comment`}
              className="field min-h-[96px]"
              maxLength={MAX_COMMENT}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="flex items-start gap-3 text-[15px] text-[color:var(--ink-2)]">
            <input
              type="checkbox"
              required
              className="mt-1 h-5 w-5 shrink-0"
              checked={consent}
              aria-invalid={Boolean(errors.consent)}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked) setErrors((p) => ({ ...p, consent: '' }));
              }}
            />
            <span>
              Я согласен(на) на обработку персональных данных.{' '}
              <a href="/privacy" className="underline">
                Политика конфиденциальности
              </a>
            </span>
          </label>
          {errors.consent && (
            <span className="field-error" role="alert">
              {errors.consent}
            </span>
          )}
        </div>

        <div className="mt-5">
          <button
            type="submit"
            className="btn btn--primary w-full md:w-auto md:min-w-[260px]"
            disabled={sending}
            aria-busy={sending}
          >
            {sending ? 'Отправляем…' : isMeasure ? 'Вызвать замерщика' : 'Получить расчёт'}
          </button>
        </div>

        <p id={`${uid}-note`} className="mt-3 text-[13px] text-[color:var(--muted)]">
          Предварительный расчёт не заменяет точный замер. Итоговая стоимость подтверждается
          менеджером после уточнения параметров.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[15px] text-[color:var(--ink-2)]">Или напишите в WhatsApp</span>
          <a
            href={waLink({ context: isMeasure ? 'measurement' : 'calculation' })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--wa min-h-[44px] px-4 py-2 text-[15px]"
            onClick={() =>
              track('click_whatsapp', {
                placement: 'contacts',
                context: isMeasure ? 'measurement' : 'calculation',
              })
            }
          >
            Написать в WhatsApp
          </a>
        </div>

        {/* Состояния (таблица 11.3). «Отправлено» — только после HTTP 200. */}
        <div className="mt-5" aria-live="polite">
          {status === 'success' && (
            <p className="text-[15px] text-[color:var(--success)]">
              Заявка отправлена. Менеджер свяжется с вами. <MarkerText text={NOTES.responseTime} />{' '}
              Если вопрос срочный, напишите в WhatsApp.
            </p>
          )}

          {status === 'not_configured' && (
            <p className="text-[15px] text-[color:var(--error)]">
              Форма сейчас не подключена. Напишите нам в WhatsApp или позвоните: {CONTACTS.phone}
            </p>
          )}

          {status === 'server_error' && (
            <p className="text-[15px] text-[color:var(--error)]">
              Не удалось отправить заявку. Напишите нам в WhatsApp или позвоните: {CONTACTS.phone}
            </p>
          )}

          {status === 'offline' && (
            <p className="text-[15px] text-[color:var(--error)]">
              Нет соединения. Заявка не отправлена. Напишите нам в WhatsApp или позвоните:{' '}
              {CONTACTS.phone}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function mapServiceToNeed(service: string): string {
  const value = service.toLowerCase();
  if (value.includes('ремонт')) return 'Ремонт';
  if (value.includes('витраж') || value.includes('фасад')) return 'Витражи и фасад';
  if (value.includes('двер')) return 'Двери';
  if (value.includes('замер')) return 'Вызвать замерщика';
  if (value.includes('окн') || value.includes('алюмин')) return 'Окна';
  return 'Другое';
}
