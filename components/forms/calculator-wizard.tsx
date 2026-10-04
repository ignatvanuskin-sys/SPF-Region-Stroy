'use client';

import * as React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  DoorOpen,
  Frame,
  Grid2x2,
  LayoutPanelTop,
  MessageCircle,
  PanelsTopLeft,
  Phone,
  Ruler,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Alert, Badge } from '@/components/ui/feedback';
import { fieldError, useLeadSubmit } from '@/components/forms/use-lead-submit';
import { ASTANA_DISTRICTS } from '@/content/site';
import { formatTel } from '@/components/site/contact-types';
import { CONSENT_TEXT } from '@/lib/validation';
import { formatMoney } from '@/lib/utils';
import { track } from '@/lib/tracking';
import { cn } from '@/lib/utils';

/**
 * Мастер предварительного расчёта (§8.2).
 *
 * Четыре шага, на мобильном — по одному вопросу на экран, с прогрессом и
 * кнопкой «Назад». Задача мастера не «посчитать цену», а собрать полную
 * конфигурацию, чтобы менеджеру не пришлось переспрашивать.
 *
 * Пока владелец не дал прайс, режим `off`: цена не показывается ни здесь, ни в
 * ответе API. После получения прайса достаточно переключить PRICE_DISPLAY=range
 * — интерфейс уже готов показать диапазон с пометкой «после замера».
 */

type ProductValue = 'okno-pvh' | 'okno-alyum' | 'vitrazh' | 'dver' | 'peregorodka' | 'balkon';

const PRODUCTS: { value: ProductValue; label: string; hint: string; Icon: typeof Frame }[] = [
  { value: 'okno-pvh', label: 'Окно ПВХ', hint: 'Квартира, дом, офис', Icon: Frame },
  { value: 'okno-alyum', label: 'Алюминиевое окно', hint: 'Большие проёмы, холодное остекление', Icon: Grid2x2 },
  { value: 'vitrazh', label: 'Витраж / фасад', hint: 'Дом, магазин, входная группа', Icon: Building2 },
  { value: 'dver', label: 'Входная дверь', hint: 'Металлопластик или алюминий', Icon: DoorOpen },
  { value: 'peregorodka', label: 'Перегородка', hint: 'Офис, кабинет, СТО', Icon: LayoutPanelTop },
  { value: 'balkon', label: 'Балкон / лоджия', hint: 'Остекление и ремонт', Icon: PanelsTopLeft },
];

const OPENINGS = [
  { value: 'fixed', label: 'Глухое', hint: 'Не открывается' },
  { value: 'turn', label: 'Поворотное', hint: 'Открывается внутрь' },
  { value: 'tilt-turn', label: 'Поворотно-откидное', hint: 'Открывается и проветривает' },
  { value: 'sliding', label: 'Сдвижное', hint: 'Раздвижные створки' },
] as const;

const GLAZING = [
  'Однокамерный',
  'Двухкамерный',
  'Двухкамерный энергосберегающий',
  'Трёхкамерный',
];

const COLORS = ['Белый', 'Ламинация под дерево', 'Антрацит', 'Серый', 'Другой — уточним'];

const OPTIONS = ['Москитная сетка', 'Подоконник', 'Отлив', 'Откосы'];

const TIMING = ['Как можно скорее', 'В течение месяца', '1–3 месяца', 'Пока планирую'];

const STEP_TITLES = ['Что нужно', 'Параметры', 'Где и когда', 'Контакты'];

interface WizardState {
  productType: ProductValue | '';
  widthMm: string;
  heightMm: string;
  sections: string;
  opening: string;
  quantity: string;
  color: string;
  glazing: string;
  options: string[];
  needInstall: boolean;
  needDelivery: boolean;
  district: string;
  desiredTiming: string;
  notes: string;
  name: string;
  phone: string;
  contactChannel: 'call' | 'whatsapp';
  consent: boolean;
}

const INITIAL: WizardState = {
  productType: '',
  widthMm: '',
  heightMm: '',
  sections: '1',
  opening: 'tilt-turn',
  quantity: '1',
  color: 'Белый',
  glazing: 'Двухкамерный',
  options: [],
  needInstall: true,
  needDelivery: true,
  district: '',
  desiredTiming: 'Как можно скорее',
  notes: '',
  name: '',
  phone: '',
  contactChannel: 'call',
  consent: false,
};

export function CalculatorWizard({
  phonePrimary,
  whatsappPrimary,
  priceDisplay,
}: {
  phonePrimary: string;
  whatsappPrimary: string;
  priceDisplay: 'off' | 'range';
}) {
  const [step, setStep] = React.useState(0);
  const [state, setState] = React.useState<WizardState>(INITIAL);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = React.useState('');
  const { status, error, success, submit, reset } = useLeadSubmit('calculator');
  const stepRef = React.useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key as string]) return previous;
      const next = { ...previous };
      delete next[key as string];
      return next;
    });
  };

  React.useEffect(() => {
    if (step > 0) track(`calc_step_${step + 1}`, { product: state.productType || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  React.useEffect(() => {
    track('calc_start');
  }, []);

  const goTo = (next: number) => {
    setStep(next);
    // Переводим фокус на заголовок шага: скринридер объявит новый экран.
    window.requestAnimationFrame(() => stepRef.current?.focus());
  };

  function validateStep(index: number): boolean {
    const local: Record<string, string> = {};
    if (index === 0 && !state.productType) {
      local.productType = 'Выберите, что нужно';
    }
    if (index === 1) {
      const width = Number(state.widthMm);
      const height = Number(state.heightMm);
      if (!Number.isFinite(width) || width < 200 || width > 20000) {
        local.widthMm = 'Укажите ширину в миллиметрах, например 1400';
      }
      if (!Number.isFinite(height) || height < 200 || height > 20000) {
        local.heightMm = 'Укажите высоту в миллиметрах, например 1500';
      }
      const sections = Number(state.sections);
      if (!Number.isFinite(sections) || sections < 1 || sections > 12) {
        local.sections = 'Количество створок — от 1 до 12';
      }
    }
    if (index === 2 && !state.district) {
      local.district = 'Выберите район — это влияет на выезд';
    }
    if (index === 3) {
      if (state.name.trim().length < 2) local.name = 'Как к вам обращаться?';
      if (state.phone.replace(/\D/g, '').length < 10) local.phone = 'Укажите номер телефона';
      if (!state.consent) local.consent = 'Отметьте согласие на обработку данных';
    }
    setErrors(local);
    return Object.keys(local).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (step < 3) goTo(step + 1);
    else void handleSubmit();
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;
    const sent = await submit(
      {
        formType: 'calculator',
        name: state.name,
        phone: state.phone,
        district: state.district || undefined,
        contactChannel: state.contactChannel,
        comment: state.notes || undefined,
        consent: true,
        calc: {
          productType: state.productType,
          widthMm: Number(state.widthMm),
          heightMm: Number(state.heightMm),
          sections: Number(state.sections),
          opening: state.opening,
          quantity: Number(state.quantity || 1),
          color: state.color,
          glazing: state.glazing,
          options: state.options,
          needInstall: state.needInstall,
          needDelivery: state.needDelivery,
          desiredTiming: state.desiredTiming,
        },
      },
      honeypot,
    );
    if (sent) track('calc_complete', { product: String(state.productType) });
  }

  // ------------------------------------------------------------ success view

  if (status === 'success' && success) {
    const price = success.raw?.price as
      | { mode: 'range'; low: number; high: number; currency: string; disclaimer: string }
      | { mode: 'off' }
      | undefined;

    return (
      <div className="space-y-5">
        <Alert tone="success" live className="flex-col gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--color-ink)]">
                {success.duplicate ? 'Заявка уже принята' : 'Заявка принята'}
              </p>
              {price?.mode === 'range' ? (
                <>
                  <p className="mt-2 text-xl font-bold text-[var(--color-ink)]">
                    {formatMoney(price.low, price.currency === 'KZT' ? '₸' : price.currency)} –{' '}
                    {formatMoney(price.high, price.currency === 'KZT' ? '₸' : price.currency)}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-soft)]">{price.disclaimer}</p>
                </>
              ) : (
                <p className="mt-1 text-[var(--color-ink-soft)]">
                  Предварительный расчёт подготовит менеджер — он видит все параметры вашей конструкции.
                </p>
              )}
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
              onClick={() => track('whatsapp_click', { place: 'calc_success' })}
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
            onClick={() => {
              reset();
              setState(INITIAL);
              goTo(0);
            }}
            className="cursor-pointer self-start text-[0.8125rem] text-[var(--color-ink-muted)] underline underline-offset-2"
          >
            Новый расчёт
          </button>
        </Alert>
      </div>
    );
  }

  // --------------------------------------------------------------- wizard UI

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <div className="space-y-6">
      {/* Прогресс: и визуально, и текстом — цвет не единственный носитель смысла. */}
      <div>
        <div className="mb-2 flex items-center justify-between text-[0.8125rem] font-semibold">
          <span className="text-[var(--color-glass)]">
            Шаг {step + 1} из {STEP_TITLES.length}
          </span>
          <span className="text-[var(--color-ink-muted)]">{STEP_TITLES[step]}</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEP_TITLES.length}
          aria-label="Прогресс расчёта"
        >
          <div
            className="h-full rounded-full bg-[var(--color-glass)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h2
        ref={stepRef}
        tabIndex={-1}
        className="text-xl font-bold tracking-tight outline-none"
        aria-live="polite"
      >
        {step === 0 ? 'Что нужно рассчитать?' : null}
        {step === 1 ? 'Параметры конструкции' : null}
        {step === 2 ? 'Где и когда' : null}
        {step === 3 ? 'Как с вами связаться' : null}
      </h2>

      {/* Шаг 1 — тип конструкции */}
      {step === 0 ? (
        <fieldset className="space-y-3">
          <legend className="sr-only">Выберите тип конструкции</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PRODUCTS.map(({ value, label, hint, Icon }) => {
              const active = state.productType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('productType', value)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors',
                    active
                      ? 'border-[var(--color-glass)] bg-[var(--color-glass-soft)]'
                      : 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-glass)]',
                  )}
                >
                  <Icon
                    className={cn('size-5 shrink-0', active ? 'text-[var(--color-glass-deep)]' : 'text-[var(--color-glass)]')}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-semibold">{label}</span>
                    <span className="block text-[0.8125rem] text-[var(--color-ink-muted)]">{hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {errors.productType ? (
            <p role="alert" className="text-[0.8125rem] font-medium text-[var(--color-danger)]">
              {errors.productType}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {/* Шаг 2 — параметры */}
      {step === 1 ? (
        <div className="space-y-5">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-3.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-soft)]">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
              <Ruler className="size-4 text-[var(--color-glass)]" aria-hidden="true" />
              Как измерить
            </p>
            <p className="mt-1">
              Измерьте ширину и высоту проёма в миллиметрах — по краям рамы, без учёта наличников.
              Если сомневаетесь, укажите примерно: точные размеры снимет мастер на замере.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="calc-width" label="Ширина, мм" required error={errors.widthMm}>
              <Input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                min={200}
                max={20000}
                placeholder="1400"
                value={state.widthMm}
                onChange={(event) => set('widthMm', event.target.value)}
                invalid={Boolean(errors.widthMm)}
              />
            </Field>
            <Field id="calc-height" label="Высота, мм" required error={errors.heightMm}>
              <Input
                type="number"
                inputMode="numeric"
                enterKeyHint="next"
                min={200}
                max={20000}
                placeholder="1500"
                value={state.heightMm}
                onChange={(event) => set('heightMm', event.target.value)}
                invalid={Boolean(errors.heightMm)}
              />
            </Field>
            <Field id="calc-sections" label="Количество створок" required error={errors.sections}>
              <Select value={state.sections} onChange={(event) => set('sections', event.target.value)}>
                {Array.from({ length: 6 }, (_, index) => String(index + 1)).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="calc-quantity" label="Сколько таких конструкций">
              <Select value={state.quantity} onChange={(event) => set('quantity', event.target.value)}>
                {['1', '2', '3', '4', '5', '6', '8', '10', 'более 10'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold">Тип открывания</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPENINGS.map((opening) => (
                <label
                  key={opening.value}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 transition-colors',
                    state.opening === opening.value
                      ? 'border-[var(--color-glass)] bg-[var(--color-glass-soft)]'
                      : 'border-[var(--color-line-strong)] hover:border-[var(--color-glass)]',
                  )}
                >
                  <input
                    type="radio"
                    name="opening"
                    value={opening.value}
                    checked={state.opening === opening.value}
                    onChange={() => set('opening', opening.value)}
                    className="size-4 accent-[var(--color-glass)]"
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-medium">{opening.label}</span>
                    <span className="block text-[0.75rem] text-[var(--color-ink-muted)]">{opening.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="calc-glazing" label="Стеклопакет" hint="Точный вариант подберём на замере">
              <Select value={state.glazing} onChange={(event) => set('glazing', event.target.value)}>
                {GLAZING.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="calc-color" label="Цвет профиля">
              <Select value={state.color} onChange={(event) => set('color', event.target.value)}>
                {COLORS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold">Дополнительно</legend>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.map((option) => {
                const active = state.options.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      set(
                        'options',
                        active ? state.options.filter((item) => item !== option) : [...state.options, option],
                      )
                    }
                    className={cn(
                      'min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors',
                      active
                        ? 'border-[var(--color-glass)] bg-[var(--color-glass)] text-white'
                        : 'border-[var(--color-line-strong)] bg-[var(--color-surface)] hover:border-[var(--color-glass)]',
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      ) : null}

      {/* Шаг 3 — где и когда */}
      {step === 2 ? (
        <div className="space-y-5">
          <Field id="calc-district" label="Район" required error={errors.district}>
            <Select
              value={state.district}
              onChange={(event) => set('district', event.target.value)}
              invalid={Boolean(errors.district)}
            >
              <option value="">Выберите район</option>
              {ASTANA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </Select>
          </Field>

          <Field id="calc-timing" label="Когда планируете">
            <Select value={state.desiredTiming} onChange={(event) => set('desiredTiming', event.target.value)}>
              {TIMING.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              id="calc-install"
              checked={state.needInstall}
              onChange={(event) => set('needInstall', event.target.checked)}
              label="Нужен монтаж"
            />
            <Checkbox
              id="calc-delivery"
              checked={state.needDelivery}
              onChange={(event) => set('needDelivery', event.target.checked)}
              label="Нужна доставка"
            />
          </div>

          <Field
            id="calc-notes"
            label="Комментарий"
            hint="Например: нужен выезд в первой половине дня, есть эскиз"
          >
            <Textarea
              value={state.notes}
              onChange={(event) => set('notes', event.target.value)}
              placeholder="Что важно учесть?"
            />
          </Field>

          <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Условия выезда на замер уточним при подтверждении — если ваш район за городом, менеджер
            скажет об этом сразу.
          </p>
        </div>
      ) : null}

      {/* Шаг 4 — контакты */}
      {step === 3 ? (
        <div className="space-y-5">
          {status === 'error' && error ? (
            <Alert tone="danger" live>
              {error.message}
            </Alert>
          ) : null}

          <Field id="calc-name" label="Ваше имя" required error={errors.name ?? fieldError(error, 'name')}>
            <Input
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Как к вам обращаться"
              value={state.name}
              onChange={(event) => set('name', event.target.value)}
              invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            id="calc-phone"
            label="Телефон"
            required
            hint="Нужен, чтобы отправить расчёт и уточнить детали"
            error={errors.phone ?? fieldError(error, 'phone')}
          >
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              placeholder="+7 700 000 00 00"
              value={state.phone}
              onChange={(event) => set('phone', event.target.value)}
              invalid={Boolean(errors.phone)}
            />
          </Field>

          <fieldset className="space-y-2.5">
            <legend className="text-sm font-semibold">Удобный канал связи</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { value: 'call', label: 'Звонок' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                ] as const
              ).map((channel) => (
                <label
                  key={channel.value}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3.5',
                    state.contactChannel === channel.value
                      ? 'border-[var(--color-glass)] bg-[var(--color-glass-soft)]'
                      : 'border-[var(--color-line-strong)]',
                  )}
                >
                  <input
                    type="radio"
                    name="contactChannel"
                    value={channel.value}
                    checked={state.contactChannel === channel.value}
                    onChange={() => set('contactChannel', channel.value)}
                    className="size-4 accent-[var(--color-glass)]"
                  />
                  <span className="text-[0.9375rem] font-medium">{channel.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="calc-company">Не заполняйте это поле</label>
            <input
              id="calc-company"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          <Checkbox
            id="calc-consent"
            checked={state.consent}
            onChange={(event) => set('consent', event.target.checked)}
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

          {priceDisplay === 'off' ? (
            <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
              Точную стоимость рассчитает менеджер после уточнения параметров или замера.
            </p>
          ) : (
            <Badge tone="cta">Ориентировочный диапазон покажем после отправки</Badge>
          )}
        </div>
      ) : null}

      {/* Навигация мастера */}
      <div className="flex items-center gap-3 border-t border-[var(--color-line)] pt-5">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={status === 'loading'}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Назад
          </Button>
        ) : null}
        <Button
          type="button"
          variant="cta"
          size="lg"
          className="flex-1"
          onClick={next}
          loading={status === 'loading'}
        >
          {step < 3 ? (
            <>
              Далее
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          ) : (
            'Получить расчёт'
          )}
        </Button>
      </div>

      <p className="text-center text-[0.8125rem] text-[var(--color-ink-muted)]">
        Нужен совет прямо сейчас?{' '}
        <a
          href={`https://wa.me/${whatsappPrimary}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp_click', { place: 'calc_footer' })}
          className="text-[var(--color-glass)] underline underline-offset-2"
        >
          Напишите в WhatsApp
        </a>{' '}
        или позвоните{' '}
        <a href={`tel:${phonePrimary}`} className="whitespace-nowrap text-[var(--color-glass)] underline underline-offset-2">
          {formatTel(phonePrimary)}
        </a>
        .
      </p>
    </div>
  );
}
