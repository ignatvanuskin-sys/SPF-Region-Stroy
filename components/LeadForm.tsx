'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, X } from 'lucide-react';

import { NOTES } from '@/content/notes';
import { CONTACTS } from '@/content/contacts';
import { MarkerText } from '@/components/MarkerText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { waLink } from '@/lib/whatsapp';
import { track } from '@/lib/analytics';
import { utmForLead } from '@/lib/utm';
import { availableSlots, groupSlotsByDay, type Slot } from '@/lib/pipeline/schedule';
import {
  ACCEPTED_IMAGE_TYPES,
  CATEGORIES,
  MAX_COMMENT,
  MAX_FILES,
  MAX_FILE_SIZE,
  OBJECT_TYPES,
  PHONE_ERROR_TEXT,
  formatPhoneInput,
  normalizePhone,
} from '@/lib/validation';

type Status = 'idle' | 'sending' | 'success' | 'server_error' | 'not_configured' | 'offline';

const STEPS = ['Что нужно', 'Детали и фото', 'Связь и замер'] as const;

/**
 * Форма заявки — три шага с индикатором прогресса.
 *
 * Почему шаги: одноэкранная форма с 10 полями отпугивает, а пошаговая
 * снижает порог входа — первый экран просит только категорию.
 * Фото сжимаются в браузере, чтобы загрузка работала на мобильном интернете.
 */
export function LeadForm({
  id,
  initialCategory = 'windows',
  initialSlot = '',
}: {
  id?: string;
  initialCategory?: string;
  initialSlot?: string;
}) {
  const uid = useId();
  const [step, setStep] = useState(1);

  const [category, setCategory] = useState<string>(initialCategory);
  const [objectType, setObjectType] = useState('');
  const [count, setCount] = useState('');
  const [sizes, setSizes] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactWay, setContactWay] = useState<'whatsapp' | 'call' | ''>('whatsapp');
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState(initialSlot);

  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ reference: string; id: string } | null>(null);
  const [started, setStarted] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  /* Слоты считаются в браузере: страницы сайта статические, и серверный
     список «застыл» бы на момент сборки. */
  useEffect(() => {
    const build = () => setSlots(availableSlots(new Date(), 60));
    build();
    const timer = window.setInterval(build, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  const currentDay = days[Math.min(dayIndex, Math.max(0, days.length - 1))];

  /* Выбор категории из hero подставляет значение и открывает форму. */
  useEffect(() => {
    const onCategory = (event: Event) => {
      const detail = (event as CustomEvent<{ category: string }>).detail;
      if (!detail?.category) return;
      setCategory(detail.category);
      setStarted(true);
      track('scenario_select', { scenario: detail.category, placement: 'hero' });
    };
    window.addEventListener('spf:category', onCategory);
    return () => window.removeEventListener('spf:category', onCategory);
  }, []);

  /* Старые карточки сценариев шлют spf:service — поддерживаем совместимость. */
  useEffect(() => {
    const onService = (event: Event) => {
      const detail = (event as CustomEvent<{ service: string }>).detail;
      const value = (detail?.service ?? '').toLowerCase();
      if (value.includes('двер')) setCategory('doors');
      else if (value.includes('витраж') || value.includes('фасад')) setCategory('facade');
      else if (value.includes('ремонт')) setCategory('repair');
      else if (value) setCategory('windows');
    };
    window.addEventListener('spf:service', onService);
    return () => window.removeEventListener('spf:service', onService);
  }, []);

  const markStart = useCallback(() => {
    if (started) return;
    setStarted(true);
    track('form_start', { form: 'details', service: category });
  }, [started, category]);

  /** Сжимает фото в браузере: ширина до 1600px, JPEG q0.8. HEIC оставляем как есть. */
  async function compress(file: File): Promise<File> {
    if (file.type === 'image/heic' || file.type === 'image/heif') return file;
    if (file.size < 400 * 1024) return file;

    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8),
      );
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
    } catch {
      // Формат не поддержан браузером — отправляем оригинал.
      return file;
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    markStart();

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
      accepted.push(await compress(file));
    }

    const merged = [...photos, ...accepted].slice(0, MAX_FILES);
    if (photos.length + accepted.length > MAX_FILES) {
      nextErrors.photos = `Не больше ${MAX_FILES} файлов.`;
    }

    setPhotos(merged);
    setPreviews(merged.map((file) => ({ url: URL.createObjectURL(file), name: file.name })));
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (accepted.length > 0) track('file_attached', { count: merged.length });
  }

  function removePhoto(index: number) {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]?.url ?? '');
      return next.map((file) => ({ url: URL.createObjectURL(file), name: file.name }));
    });
  }

  function validateStep(current: number): Record<string, string> {
    const next: Record<string, string> = {};
    if (current === 1 && !category) next.category = 'Выберите, что вам нужно';
    if (current === 3) {
      if (!normalizePhone(phone)) next.phone = PHONE_ERROR_TEXT;
      if (!consent) next.consent = 'Нужно согласие на обработку персональных данных';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        next.email = 'Проверьте адрес электронной почты';
      }
    }
    return next;
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      track('form_error', { form: 'details', reason: Object.keys(found)[0] });
      return;
    }
    markStart();
    setStep((s) => Math.min(3, s + 1));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) {
      goNext();
      return;
    }

    const found = validateStep(3);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus('sending');
    track('form_submit', { form: 'details', service: category });

    const body = new FormData();
    body.set('mode', 'details');
    body.set('category', category);
    if (objectType) body.set('objectType', objectType);
    if (count) body.set('count', count);
    if (sizes) body.set('sizes', sizes);
    if (address) body.set('address', address);
    if (name) body.set('name', name);
    body.set('phone', phone);
    if (email) body.set('email', email);
    if (contactWay) body.set('contactWay', contactWay);
    if (comment) body.set('comment', comment);
    if (slot) body.set('measurementSlot', slot);
    body.set('consent', 'true');
    body.set('website', '');
    body.set('page', window.location.pathname);
    body.set('utm', utmForLead());
    photos.forEach((file) => body.append('photos', file));

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setStatus('offline');
      track('form_error', { form: 'details', reason: 'offline' });
      return;
    }

    try {
      const res = await fetch('/api/lead', { method: 'POST', body });

      if (res.status === 503) {
        setStatus('not_configured');
        track('form_error', { form: 'details', reason: 'not_configured' });
        return;
      }
      if (!res.ok) {
        setStatus('server_error');
        track('form_error', { form: 'details', reason: `http_${res.status}` });
        return;
      }

      const data = (await res.json()) as { reference: string; id: string };
      setResult({ reference: data.reference, id: data.id });
      setStatus('success');
      track('form_success', { form: 'details', service: category });
    } catch {
      setStatus('offline');
      track('form_error', { form: 'details', reason: 'network' });
    }
  }

  const sending = status === 'sending';

  /* ── Успех: номер заявки, статус и продолжение в WhatsApp ─────── */
  if (status === 'success' && result) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 md:p-8" id={id}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </span>
          <h3 className="text-[20px] font-semibold">Заявка принята</h3>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/60 p-4">
          <p className="text-[13px] text-muted-foreground">Номер заявки</p>
          <p className="tnum mt-1 text-[22px] font-semibold">{result.reference}</p>
        </div>

        <p className="mt-4 text-[15px] text-muted-foreground">
          Менеджер свяжется с вами. <MarkerText text={NOTES.responseTime} />
        </p>

        <dl className="mt-5 space-y-2 text-[15px]">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Что нужно:</dt>
            <dd>{CATEGORIES.find((c) => c.value === category)?.label ?? '—'}</dd>
          </div>
          {slot && (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Замер:</dt>
              <dd>{slots.find((s) => s.iso === slot)?.label ?? 'выбранное время'}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Фото:</dt>
            <dd>{photos.length}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="wa" size="lg" className="flex-1">
            <a
              href={waLink({ context: 'calculation' })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('click_whatsapp', { placement: 'thanks', context: 'calculation' })}
            >
              Продолжить в WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <a href={`/zayavka/${result.id}`}>Статус заявки</a>
          </Button>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground">
          Сохраните номер заявки — по нему менеджер быстро найдёт вашу заявку в CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 md:p-7" id={id}>
      <form onSubmit={onSubmit} noValidate aria-describedby={`${uid}-note`}>
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Прогресс многошаговой формы */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-muted-foreground">
              Шаг {step} из {STEPS.length}
            </p>
            <p className="text-[13px] font-medium text-foreground">{STEPS[step - 1]}</p>
          </div>
          <Progress
            value={(step / STEPS.length) * 100}
            className="mt-2"
            aria-label={`Шаг ${step} из ${STEPS.length}`}
          />
        </div>

        {/* ── Шаг 1 ─────────────────────────────────────────── */}
        {step === 1 && (
          <fieldset>
            <legend className="text-[19px] font-semibold">Что вам нужно?</legend>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              Дальше добавите фото и выберете время замера, если удобно.
            </p>

            <div className="mt-4 grid gap-2.5">
              {CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={category === item.value}
                  onClick={() => {
                    setCategory(item.value);
                    markStart();
                  }}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-200',
                    category === item.value
                      ? 'border-primary bg-secondary'
                      : 'border-border bg-background hover:border-primary/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      category === item.value ? 'border-primary bg-primary' : 'border-input',
                    )}
                    aria-hidden="true"
                  >
                    {category === item.value && (
                      <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                    )}
                  </span>
                  <span className="block">
                    <span className="block text-[16px] font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-[14px] text-muted-foreground">
                      {item.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {errors.category && (
              <p className="mt-2 text-[14px] text-destructive" role="alert">
                {errors.category}
              </p>
            )}

            <div className="mt-5">
              <Label htmlFor={`${uid}-object`}>Тип объекта</Label>
              <select
                id={`${uid}-object`}
                className="mt-1.5 h-12 w-full cursor-pointer rounded-lg border border-input bg-background px-4 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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
          </fieldset>
        )}

        {/* ── Шаг 2 ─────────────────────────────────────────── */}
        {step === 2 && (
          <fieldset>
            <legend className="text-[19px] font-semibold">Размеры и фото</legend>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              Ничего страшного, если размеры примерные — это не заменяет замер, но ускоряет расчёт.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${uid}-count`}>Сколько конструкций</Label>
                <Input
                  id={`${uid}-count`}
                  className="mt-1.5 tnum"
                  inputMode="numeric"
                  placeholder="Например, 4"
                  value={count}
                  onFocus={markStart}
                  onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                />
              </div>
              <div>
                <Label htmlFor={`${uid}-sizes`}>Размеры, если известны</Label>
                <Input
                  id={`${uid}-sizes`}
                  className="mt-1.5"
                  placeholder="1400×1300 мм"
                  value={sizes}
                  onFocus={markStart}
                  onChange={(e) => setSizes(e.target.value.slice(0, 400))}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor={`${uid}-address`}>Адрес объекта</Label>
              <Input
                id={`${uid}-address`}
                className="mt-1.5"
                placeholder="Улица, дом, при необходимости — район"
                value={address}
                onFocus={markStart}
                onChange={(e) => setAddress(e.target.value.slice(0, 240))}
              />
            </div>

            {/* Загрузка фото с превью */}
            <div className="mt-5">
              <Label htmlFor={`${uid}-files`}>
                Фото проёмов — до {MAX_FILES} штук, до 10 МБ каждое
              </Label>
              <input
                id={`${uid}-files`}
                ref={fileInput}
                type="file"
                accept={`${ACCEPTED_IMAGE_TYPES.join(',')},image/*`}
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-1.5 flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-6 text-center transition-colors duration-200 hover:border-primary"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <span className="text-[15px] font-medium">Приложить фото</span>
                <span className="text-[13px] text-muted-foreground">
                  Фото сжимаются на устройстве — загрузка не съест мобильный трафик
                </span>
              </button>

              {previews.length > 0 && (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {previews.map((item, i) => (
                    <li key={item.url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={`Приложенное фото ${i + 1}`}
                        className="h-20 w-full rounded-lg border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Убрать фото ${i + 1}`}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {errors.photos && (
                <p className="mt-2 text-[14px] text-destructive" role="alert">
                  {errors.photos}
                </p>
              )}
            </div>
          </fieldset>
        )}

        {/* ── Шаг 3 ─────────────────────────────────────────── */}
        {step === 3 && (
          <fieldset>
            <legend className="text-[19px] font-semibold">Как с вами связаться</legend>
            <p className="mt-1.5 text-[15px] text-muted-foreground">
              И, если удобно, сразу выберите время замера.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${uid}-name`}>Имя</Label>
                <Input
                  id={`${uid}-name`}
                  className="mt-1.5"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`${uid}-phone`}>Телефон *</Label>
                <Input
                  id={`${uid}-phone`}
                  className="mt-1.5 tnum"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 701 000 00 00"
                  value={phone}
                  aria-invalid={Boolean(errors.phone)}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                />
                {errors.phone && (
                  <p className="mt-1.5 text-[14px] text-destructive" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor={`${uid}-email`}>Email — пришлём подтверждение</Label>
              <Input
                id={`${uid}-email`}
                className="mt-1.5"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@mail.kz"
                value={email}
                aria-invalid={Boolean(errors.email)}
                onChange={(e) => setEmail(e.target.value.slice(0, 160))}
              />
              {errors.email && (
                <p className="mt-1.5 text-[14px] text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-muted-foreground">
                Удобный способ связи
              </legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(
                  [
                    ['whatsapp', 'WhatsApp'],
                    ['call', 'Звонок'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={contactWay === value}
                    onClick={() => setContactWay(contactWay === value ? '' : value)}
                    className={cn(
                      'min-h-[44px] cursor-pointer rounded-full border px-4 text-[15px] font-medium transition-colors duration-200',
                      contactWay === value
                        ? 'border-primary bg-secondary text-secondary-foreground'
                        : 'border-border hover:border-primary',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Запись на замер */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Время замера</Label>
                {slot && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {slots.find((s) => s.iso === slot)?.label}
                  </Badge>
                )}
              </div>

              {days.length === 0 ? (
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Свободных слотов не осталось — менеджер предложит время по телефону.
                </p>
              ) : (
                <>
                  <div className="scroll-x mt-2 flex gap-1.5 pb-2">
                    {days.map((day, i) => (
                      <button
                        key={day.dayLabel}
                        type="button"
                        onClick={() => setDayIndex(i)}
                        className={cn(
                          'min-h-[40px] shrink-0 cursor-pointer rounded-full border px-3.5 text-[14px] font-medium transition-colors duration-200',
                          i === dayIndex
                            ? 'border-primary bg-secondary text-secondary-foreground'
                            : 'border-border hover:border-primary',
                        )}
                      >
                        {day.dayLabel}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                    {currentDay?.slots.map((item) => (
                      <button
                        key={item.iso}
                        type="button"
                        aria-pressed={slot === item.iso}
                        onClick={() => setSlot(slot === item.iso ? '' : item.iso)}
                        className={cn(
                          'tnum min-h-[44px] cursor-pointer rounded-lg border text-[15px] font-medium transition-colors duration-200',
                          slot === item.iso
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary',
                        )}
                      >
                        {item.timeLabel}
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-[13px] text-muted-foreground">
                    Слот предварительный: менеджер подтвердит выезд. Не удобно — выберите другое
                    время или оставьте пустым.
                  </p>
                </>
              )}
            </div>

            <div className="mt-5">
              <Label htmlFor={`${uid}-comment`}>Комментарий</Label>
              <Textarea
                id={`${uid}-comment`}
                className="mt-1.5"
                maxLength={MAX_COMMENT}
                placeholder="Что важно учесть: этаж, доступ, сроки"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="mt-5 flex items-start gap-3">
              <Checkbox
                id={`${uid}-consent`}
                checked={consent}
                aria-invalid={Boolean(errors.consent)}
                onCheckedChange={(v) => {
                  setConsent(v === true);
                  if (v === true) setErrors((p) => ({ ...p, consent: '' }));
                }}
              />
              <Label htmlFor={`${uid}-consent`} className="text-[15px] leading-snug">
                Согласен(на) на обработку персональных данных.{' '}
                <a href="/privacy" className="underline underline-offset-2">
                  Политика конфиденциальности
                </a>
              </Label>
            </div>
            {errors.consent && (
              <p className="mt-1.5 text-[14px] text-destructive" role="alert">
                {errors.consent}
              </p>
            )}
          </fieldset>
        )}

        {/* ── Навигация по шагам ───────────────────────────── */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={sending}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Назад
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" size="lg" className="sm:min-w-[200px]" onClick={goNext}>
              Далее
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="sm:min-w-[240px]"
              disabled={sending}
              aria-busy={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Отправляем…
                </>
              ) : (
                'Отправить заявку'
              )}
            </Button>
          )}

          <Button asChild variant="ghost" size="lg" type="button">
            <a
              href={waLink({ context: 'calculation' })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('click_whatsapp', { placement: 'contacts', context: 'calculation' })}
            >
              Проще в WhatsApp
            </a>
          </Button>
        </div>

        <p id={`${uid}-note`} className="mt-3 text-[13px] text-muted-foreground">
          Предварительный расчёт не заменяет точный замер. Итоговую стоимость подтверждает менеджер.
        </p>

        <div className="mt-4" aria-live="polite">
          {status === 'not_configured' && (
            <p className="text-[15px] text-destructive">
              Форма сейчас не подключена. Напишите в WhatsApp или позвоните:{' '}
              <a href={CONTACTS.phoneHref} className="tnum underline">
                {CONTACTS.phone}
              </a>
            </p>
          )}
          {status === 'server_error' && (
            <p className="text-[15px] text-destructive">
              Не удалось отправить заявку. Напишите в WhatsApp или позвоните:{' '}
              <a href={CONTACTS.phoneHref} className="tnum underline">
                {CONTACTS.phone}
              </a>
            </p>
          )}
          {status === 'offline' && (
            <p className="text-[15px] text-destructive">
              Нет соединения, заявка не отправлена. Проверьте интернет и попробуйте снова.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
