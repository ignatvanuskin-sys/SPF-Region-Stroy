'use client';

import Link from 'next/link';

import { telLink, WA_FALLBACK_LINK_LABEL, waLink, type WaContext } from '@/lib/whatsapp';
import { track, type Placement, type WaContextName } from '@/lib/analytics';
import { CONTACTS } from '@/content/contacts';

interface CommonProps {
  placement: Placement;
  className?: string;
  label?: string;
  fullWidth?: boolean;
}

const base = 'btn';

/* ── P1: WhatsApp ───────────────────────────────────────────── */

export function WaButton({
  context,
  subject,
  placement,
  label,
  className = '',
  fullWidth,
}: CommonProps & { context: WaContext; subject?: string }) {
  return (
    <a
      href={waLink({ context, subject })}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} btn--wa ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={() =>
        track('click_whatsapp', {
          placement,
          context: context as WaContextName,
        })
      }
    >
      {label ?? 'Написать в WhatsApp'}
    </a>
  );
}

/** Ссылка-запасной путь, если WhatsApp не установлен (раздел 7). */
export function WaFallback({ placement }: { placement: Placement }) {
  return (
    <a
      href={telLink()}
      className="mt-2 block text-[14px] text-[color:var(--muted)] underline underline-offset-2"
      onClick={() => track('click_phone', { placement })}
    >
      {WA_FALLBACK_LINK_LABEL}
    </a>
  );
}

/* ── P2: звонок ─────────────────────────────────────────────── */

export function CallButton({ placement, label, className = '', fullWidth }: CommonProps) {
  return (
    <a
      href={telLink()}
      className={`${base} btn--secondary ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={() => track('click_phone', { placement })}
    >
      {label ?? 'Позвонить менеджеру'}
    </a>
  );
}

/** Телефон текстом со ссылкой tel: */
export function PhoneText({
  placement,
  className = '',
  showIcon = true,
}: {
  placement: Placement;
  className?: string;
  showIcon?: boolean;
}) {
  return (
    <a
      href={telLink()}
      className={`inline-flex items-center gap-2 font-semibold text-[color:var(--ink)] hover:text-[color:var(--accent)] ${className}`}
      onClick={() => track('click_phone', { placement })}
    >
      {showIcon && <PhoneIcon />}
      <span className="tnum">{CONTACTS.phone}</span>
    </a>
  );
}

/* ── P3: заявка на расчёт / замер ───────────────────────────── */

export function QuoteButton({
  placement,
  label,
  mode = 'quote',
  service,
  className = '',
  fullWidth,
}: CommonProps & { mode?: 'quote' | 'measure'; service?: string }) {
  void service;
  return (
    <Link
      href={mode === 'measure' ? '/#zayavka' : '/#zayavka'}
      scroll
      className={`${base} btn--primary ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={() => track('form_start', { placement: undefined, form: 'quick' })}
    >
      {label ?? (mode === 'measure' ? 'Вызвать замерщика' : 'Получить расчёт')}
    </Link>
  );
}

/** Кнопка «Отправить размеры и фото» — WhatsApp с текстом про расчёт (раздел 7). */
export function PhotosButton({ placement, className = '' }: CommonProps) {
  return (
    <WaButton
      context="calculation"
      placement={placement}
      label="Отправить размеры и фото"
      className={className}
    />
  );
}

/* ── Внешние ссылки ─────────────────────────────────────────── */

export function ExternalLink({
  href,
  children,
  placement,
  event,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  placement: Placement;
  event: 'click_2gis' | 'click_instagram' | 'click_email' | 'click_map_route' | 'click_whatsapp';
  className?: string;
}) {
  const isMail = event === 'click_email';
  return (
    <a
      href={href}
      {...(isMail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
      className={className}
      onClick={() => track(event, { placement })}
    >
      {children}
    </a>
  );
}

/* ── Иконки (собственные линейные SVG, stroke 1.5) ──────────── */

export function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.4-4.4A8.4 8.4 0 1 1 20.5 11.8Z" />
      <path d="M8.8 8.2c-.4.9-.1 2.2.8 3.4a8 8 0 0 0 2.9 2.5c1.2.5 2.2.4 2.8-.1" />
    </svg>
  );
}
