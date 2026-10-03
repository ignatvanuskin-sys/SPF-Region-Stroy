'use client';

/**
 * components/Quiz.tsx — пошаговый квиз предварительного расчета (раздел 5 брифа).
 *
 * Четыре шага: объект → услуга → детали → контакты.
 * Первый шаг можно пройти одним кликом из раздела «Выбор по типу объекта»:
 * выбранное там значение приходит через spf:object.
 *
 * Отправка не имитируется: успех показывается только после ответа сервера 200.
 * Если канал не подключен, форма честно говорит об этом и предлагает WhatsApp.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  MessageCircle,
  X,
} from 'lucide-react';

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
import { consumeLeadIntent, peekLeadIntent } from '@/lib/lead-intent';
import { availableSlots, groupSlotsByDay, type Slot } from '@/lib/pipeline/schedule';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_COMMENT,
  MAX_FILES,
  MAX_FILE_SIZE,
  OBJECT_TYPES,
  PHONE_ERROR_TEXT,
  formatPhoneInput,
  normalizePhone,
} from '@/lib/validation';

type Status = 'idle' | 'sending' | 'success' | 'server_error' | 'not_configured' | 'offline';

/** Шаг 1: что нужно остеклить. */
const TARGETS = [
  { value: 'flat', label: 'Квартиру', service: 'Окна' },
  { value: 'house', label: 'Дом', service: 'Окна' },
  { value: 'balcony', label: 'Балкон', service: 'Остекление балкона' },
  { value: 'commercial', label: 'Коммерческий объект', service: 'Алюминиевые конструкции' },
  { value: 'facade', label: 'Фасад', service: 'Фасадное остекление' },
] as const;

/** Шаг 2: какая услуга нужна. */
const SERVICES = [
  { value: 'windows', label: 'Окна', hint: 'ПВХ и металлопластик' },
  { value: 'doors', label: 'Двери', hint: 'балконные, тамбур, входные' },
  { value: 'aluminium', label: 'Алюминиевые конструкции', hint: 'окна, двери, перегородки' },
  { value: 'facade', label: 'Фасадное остекление', hint: 'витражи и фасады' },
  { value: 'repair', label: 'Ремонт', hint: 'фурнитура, уплотнения, регулировка' },
] as const;

const STEPS = [
  'Что нужно остеклить?',
  'Какая услуга нужна?',
  'Добавьте детали',
  'Как с вами связаться?',
] as const;

export function Quiz({ id, initialSlot = '' }: { id?: string; initialSlot?: string }) {
  const uid = useId();
  const [step, setStep] = useState(1);
  const [started, setStarted] = useState(false);

  // Шаг 1
  const [target, setTarget] = useState('');
  // Шаг 2
  const [service, setService] = useState('');
  // Шаг 3
  const [count, setCount] = useState('');
  const [sizes, setSizes] = useState('');
  const [address, setAddress] = useState('');
  const [objectType, setObjectType] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  // Шаг 4
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactWay, setContactWay] = useState<'whatsapp' | 'call'>('whatsapp');
  const [consent, setConsent] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState(initialSlot);

  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ reference: string; id: string } | null>(null);
  const [showSlotPicker, setShowSlotPicker] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  /* Слоты считаем в браузере: страницы статические, серверный список «застыл» бы. */
  useEffect(() => {
    const build = () => setSlots(availableSlots(new Date(), 60));
    build();
    const timer = window.setInterval(build, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const days = useMemo(() => groupSlotsByDay(slots), [slots]);
  const currentDay = days[Math.min(dayIndex, Math.max(0, days.length - 1))];

  /* Выбор из раздела «тип объекта»: подставляем и открываем квиз. */
  useEffect(() => {
    const saved = consumeLeadIntent() ?? peekLeadIntent();
    if (!saved) return;
    if (TARGETS.some((t) => t.value === saved)) {
      setTarget(saved);
      setStarted(true);
    }
  }, []);

  useEffect(() => {
    const onObject = (event: Event) => {
      const detail = (event as CustomEvent<{ object: string }>).detail;
      if (!detail?.object) return;
      if (TARGETS.some((t) => t.value === detail.object)) {
        setTarget(detail.object);
        setStarted(true);
      }
    };
    window.addEventListener('spf:object', onObject);
    return () => window.removeEventListener('spf:object', onObject);
  }, []);

  const markStart = useCallback(() => {
    if (started) return;
    setStarted(true);
    track('quiz_start', { form: 'quiz' });
  }, [started]);

  /** Сжатие фото в браузере: ширина до 1600px, JPEG 0.8. HEIC оставляем как есть. */
  async function compress(file: File): Promise<File> {
    if (file.type === 'image/heic' || file.type === 'image/heif') return file;
    if (file.size < 400 * 1024) return file;

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8),
      );
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
    } catch {
      return file;
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    markStart();

    const nextErrors: Record<string, string> = {};
    const accepted: File[] = [];

    for (const file of Array.from(list)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        nextErrors.photos = 'Можно приложить только изображения: JPG, PNG, WebP, HEIC.';
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
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return merged.map((file) => ({ url: URL.createObjectURL(file), name: file.name }));
    });
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    if (accepted.length > 0) track('photo_upload', { count: merged.length });
  }

  function removePhoto(index: number) {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return next.map((file) => ({ url: URL.createObjectURL(file), name: file.name }));
    });
  }

  function validate(current: number): Record<string, string> {
    const next: Record<string, string> = {};
    if (current === 1 && !target) next.target = 'Выберите, что нужно остеклить';
    if (current === 2 && !service) next.service = 'Выберите услугу';
    if (current === 4) {
      if (!normalizePhone(phone)) next.phone = PHONE_ERROR_TEXT;
      if (!consent) next.consent = 'Нужно согласие на обработку персональных данных';
    }
    return next;
  }

  function goNext() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    markStart();
    const next = Math.min(4, step + 1);
    setStep(next);
    track('quiz_step', { step: next, target, service });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) {
      goNext();
      return;
    }

    const found = validate(4);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setStatus('sending');
    track('form_submit', { form: 'quiz', target, service });

    const body = new FormData();
    body.set('mode', 'details');
    body.set('category', categoryValue());
    body.set('needs', 'Окна');
    body.set('targets', target);
    if (service) body.set('service', service);
    if (objectType) body.set('objectType', objectType);
    if (count) body.set('count', count);
    if (sizes) body.set('sizes', sizes);
    if (address) body.set('address', address);
    if (name) body.set('name', name);
    body.set('phone', phone);
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
      return;
    }

    try {
      const res = await fetch('/api/lead', { method: 'POST', body });

      if (res.status === 503) {
        setStatus('not_configured');
        track('form_error', { form: 'quiz', reason: 'not_configured' });
        return;
      }
      if (!res.ok) {
        setStatus('server_error');
        track('form_error', { form: 'quiz', reason: `http_${res.status}` });
        return;
      }

      const data = (await res.json()) as { reference: string; id: string };
      setResult({ reference: data.reference, id: data.id });
      setStatus('success');
      track('quiz_complete', { form: 'quiz', target, service });
      track('form_success', { form: 'quiz', target, service });
    } catch {
      setStatus('offline');
      track('form_error', { form: 'quiz', reason: 'network' });
    }
  }

  /** Категория для API: тип объекта квиза → категория заявки. */
  function categoryValue(): string {
    if (service === 'doors') return 'doors';
    if (service === 'facade' || target === 'facade') return 'facade';
    if (service === 'repair') return 'repair';
    if (service === 'aluminium' || target === 'commercial') return 'aluminium';
    return 'windows';
  }

  const sending = status === 'sending';
  const targetLabel = TARGETS.find((t) => t.value === target)?.label ?? '';
  const serviceLabel = SERVICES.find((s) => s.value === service)?.label ?? '';

  /* ── Успех ────────────────────────────────────────────────── */
  if (status === 'success' && result) {
    return (
      <div className="border border-border bg-card p-6 md:p-9" id={id}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </span>
          <h3 className="font-display text-[21px] font-semibold">Заявка принята</h3>
        </div>

        <p className="mt-4 text-[17px] text-muted-foreground">
          Менеджер свяжется с вами для уточнения деталей.
        </p>

        <div className="mt-6 grid gap-4 border-y border-border py-5 sm:grid-cols-2">
          <div>
            <p className="text-[13px] text-muted-foreground">Номер заявки</p>
            <p className="tnum mt-1 font-display text-[22px] font-semibold">{result.reference}</p>
          </div>
          <div>
            <p className="text-[13px] text-muted-foreground">Что дальше</p>
            <p className="mt-1 text-[15px]">
              Менеджер уточнит детали и предложит время замера.
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 text-[15px]">
          <Row label="Объект" value={targetLabel || '—'} />
          <Row label="Услуга" value={serviceLabel || '—'} />
          <Row label="Фото" value={`${photos.length}`} />
          {slot && <Row label="Замер" value={slots.find((s) => s.iso === slot)?.label ?? 'выбрано'} />}
        </dl>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="wa" size="lg" className="flex-1">
            <a
              href={waLink({
                context: 'calculation',
                object: targetLabel,
                service: serviceLabel,
                hasFiles: photos.length > 0,
              })}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics="click_whatsapp"
              data-placement="thanks"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
              Продолжить в WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <a href={`/zayavka/${result.id}`}>Статус заявки</a>
          </Button>
        </div>

        <p className="mt-5 text-[13px] text-muted-foreground">
          Сохраните номер: по нему менеджер найдёт заявку в CRM. <MarkerText text={NOTES.responseTime} />
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-5 md:p-9" id={id}>
      <form onSubmit={onSubmit} noValidate>
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`${uid}-website`}>Website</label>
          <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Прогресс */}
        <div className="mb-7">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[13px] font-medium text-muted-foreground">
              Шаг {step} из {STEPS.length}
            </p>
            <p className="font-display text-[15px] font-semibold">{STEPS[step - 1]}</p>
          </div>
          <Progress
            value={(step / STEPS.length) * 100}
            className="mt-2.5"
            aria-label={`Шаг ${step} из ${STEPS.length}`}
          />
        </div>

        {/* ── Шаг 1. Что нужно остеклить ─────────────────────── */}
        {step === 1 && (
          <fieldset>
            <legend className="font-display text-[21px] font-semibold">
              Что нужно остеклить?
            </legend>
            <p className="mt-2 text-[15px] text-muted-foreground">
              От типа объекта зависит решение и порядок работ.
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {TARGETS.map((item) => (
                <OptionButton
                  key={item.value}
                  label={item.label}
                  selected={target === item.value}
                  onClick={() => {
                    setTarget(item.value);
                    if (item.value === 'facade' || item.value === 'commercial') {
                      setService('facade');
                    }
                    markStart();
                  }}
                />
              ))}
            </div>

            {errors.target && <ErrorText>{errors.target}</ErrorText>}
          </fieldset>
        )}

        {/* ── Шаг 2. Услуга ─────────────────────────────────── */}
        {step === 2 && (
          <fieldset>
            <legend className="font-display text-[21px] font-semibold">
              Какая услуга нужна?
            </legend>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Если не уверены — выберите ближайшее, уточним при разговоре.
            </p>

            <div className="mt-5 grid gap-2.5">
              {SERVICES.map((item) => (
                <OptionButton
                  key={item.value}
                  label={item.label}
                  hint={item.hint}
                  selected={service === item.value}
                  onClick={() => {
                    setService(item.value);
                    markStart();
                  }}
                />
              ))}
            </div>

            {errors.service && <ErrorText>{errors.service}</ErrorText>}
          </fieldset>
        )}

        {/* ── Шаг 3. Детали ─────────────────────────────────── */}
        {step === 3 && (
          <fieldset>
            <legend className="font-display text-[21px] font-semibold">Добавьте детали</legend>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Все поля необязательные, кроме ничего — можно отправить сразу. Чем больше деталей,
              тем точнее ориентир.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${uid}-count`}>Примерное количество окон</Label>
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

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${uid}-address`}>Адрес объекта</Label>
                <Input
                  id={`${uid}-address`}
                  className="mt-1.5"
                  placeholder="Улица, дом"
                  value={address}
                  onFocus={markStart}
                  onChange={(e) => setAddress(e.target.value.slice(0, 240))}
                />
              </div>
              <div>
                <Label htmlFor={`${uid}-object`}>Тип помещения</Label>
                <select
                  id={`${uid}-object`}
                  className="mt-1.5 h-12 w-full cursor-pointer rounded-md border border-input bg-background px-4 text-base focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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
            </div>

            {/* Фото объекта */}
            <div className="mt-5">
              <Label htmlFor={`${uid}-files`}>
                Фотография объекта — до {MAX_FILES} штук, до 10 МБ
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
                className="mt-1.5 flex w-full cursor-pointer flex-col items-center gap-2 border border-dashed border-input bg-muted/40 px-4 py-6 text-center transition-colors duration-200 hover:border-primary"
              >
                <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <span className="text-[15px] font-medium">Отправить фото объекта</span>
                <span className="text-[13px] text-muted-foreground">
                  Фото сжимаются на устройстве — мобильный трафик не пострадает
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
                        className="h-20 w-full border border-border object-cover"
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

              {errors.photos && <ErrorText>{errors.photos}</ErrorText>}
            </div>

            <div className="mt-4">
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

            {/* Замер — необязательный шаг, поэтому спрятан за кнопкой */}
            <div className="mt-5 border-t border-border pt-5">
              {!showSlotPicker && !slot && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSlotPicker(true)}
                  className="px-0"
                >
                  Хочу сразу выбрать время замера
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}

              {(showSlotPicker || slot) && days.length > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Время замера</Label>
                    {slot && (
                      <Badge variant="secondary" className="gap-1.5">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {slots.find((s) => s.iso === slot)?.label}
                      </Badge>
                    )}
                  </div>

                  <div className="scroll-x mt-2 flex gap-1.5 pb-2">
                    {days.map((day, i) => (
                      <button
                        key={day.dayLabel}
                        type="button"
                        onClick={() => setDayIndex(i)}
                        className={cn(
                          'min-h-[42px] shrink-0 cursor-pointer border px-3.5 text-[14px] font-medium transition-colors duration-200',
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
                          'tnum min-h-[46px] cursor-pointer border text-[15px] font-medium transition-colors duration-200',
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
                    Слот предварительный: менеджер подтвердит выезд.
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        )}

        {/* ── Шаг 4. Контакты ───────────────────────────────── */}
        {step === 4 && (
          <fieldset>
            <legend className="font-display text-[21px] font-semibold">
              Как с вами связаться?
            </legend>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Телефон нужен, чтобы согласовать замер. Остальное — по желанию.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                {errors.phone && <ErrorText>{errors.phone}</ErrorText>}
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-muted-foreground">
                Удобный способ связи
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
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
                    onClick={() => setContactWay(value)}
                    className={cn(
                      'min-h-[46px] cursor-pointer border px-5 text-[15px] font-medium transition-colors duration-200',
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

            <div className="mt-6 flex items-start gap-3">
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
            {errors.consent && <ErrorText>{errors.consent}</ErrorText>}
          </fieldset>
        )}

        {/* ── Навигация ─────────────────────────────────────── */}
        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
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

          {step < 4 ? (
            <Button type="button" size="lg" className="sm:min-w-[200px]" onClick={goNext}>
              Далее
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="sm:min-w-[220px]"
              disabled={sending}
              aria-busy={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Отправляем…
                </>
              ) : (
                'Получить расчет'
              )}
            </Button>
          )}

          <Button asChild variant="ghost" size="lg" type="button">
            <a
              href={waLink({
                context: 'calculation',
                object: targetLabel,
                service: serviceLabel,
                hasFiles: photos.length > 0,
              })}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics="click_whatsapp"
              data-placement="form"
            >
              Проще в WhatsApp
            </a>
          </Button>
        </div>

        <p className="mt-3 text-[13px] text-muted-foreground">
          Предварительный расчет не заменяет точный замер. Итоговую стоимость подтверждает менеджер.
        </p>

        {/* Честные состояния: успех показывается только после ответа сервера */}
        <div className="mt-4" aria-live="polite">
          {status === 'not_configured' && (
            <div className="border border-destructive/40 bg-destructive/5 p-4 text-[15px]">
              <p className="font-medium text-destructive">Форма сейчас не подключена</p>
              <p className="mt-1.5 text-muted-foreground">
                Здесь подключается приём заявок (CRM, email или WhatsApp). Пока напишите напрямую:
              </p>
              <p className="mt-2 flex flex-wrap gap-3">
                <a
                  href={waLink({ context: 'calculation' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-wa underline"
                  data-analytics="click_whatsapp"
                  data-placement="form"
                >
                  WhatsApp
                </a>
                <a href={CONTACTS.phoneHref} className="tnum font-medium text-primary underline">
                  {CONTACTS.phone}
                </a>
                <a href={CONTACTS.emailHref} className="font-medium text-primary underline">
                  {CONTACTS.email}
                </a>
              </p>
            </div>
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

/* ── Мелкие части квиза ──────────────────────────────────────── */

function OptionButton({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-[60px] cursor-pointer items-start gap-3 border p-4 text-left transition-colors duration-200',
        selected
          ? 'border-primary bg-secondary'
          : 'border-border bg-background hover:border-primary/60',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-primary bg-primary' : 'border-input',
        )}
        aria-hidden="true"
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </span>
      <span className="block">
        <span className="block font-display text-[16px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[14px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[14px] text-destructive" role="alert">
      {children}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
