/**
 * components/illustrations — собственные линейные SVG (раздел 16.6).
 *
 * Правила: линии графита --ink, ровно один акцентный элемент --accent.
 * Без брендов и без разрезов профиля с «камерами».
 * Это схемы, а не фотографии: подпись честно сообщает об этом.
 */

import type { IllustrationName } from '@/content/media';

export interface IllustrationProps {
  className?: string;
  /** Ширина/высота по умолчанию — пропорция 3:2. */
  ratio?: '3:2' | '16:9' | '4:5';
}

const VIEWBOX: Record<NonNullable<IllustrationProps['ratio']>, string> = {
  '3:2': '0 0 300 200',
  '16:9': '0 0 320 180',
  '4:5': '0 0 240 300',
};

const SIZE: Record<NonNullable<IllustrationProps['ratio']>, { w: number; h: number }> = {
  '3:2': { w: 300, h: 200 },
  '16:9': { w: 320, h: 180 },
  '4:5': { w: 240, h: 300 },
};

function Frame({
  children,
  ratio = '3:2',
  className = '',
  label,
}: IllustrationProps & { children: React.ReactNode; label: string }) {
  const { w, h } = SIZE[ratio];
  return (
    <svg
      viewBox={VIEWBOX[ratio]}
      width={w}
      height={h}
      preserveAspectRatio="xMidYMid meet"
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={label}
    >
      <g
        fill="none"
        stroke="var(--ink)"
        strokeWidth="1.5"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      >
        {children}
      </g>
    </svg>
  );
}

export function WindowSingle({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема одностворчатого окна">
      <rect x="40" y="30" width="130" height="140" />
      <path d="M100 30v140" />
      <path d="M40 100h130" strokeWidth="1" opacity="0.4" />
      <rect x="200" y="60" width="60" height="80" stroke="var(--accent)" />
      <path d="M230 60v80" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
      <path d="M210 140 240 60" strokeWidth="1" opacity="0.35" />
    </Frame>
  );
}

export function WindowDouble({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема двухстворчатого окна">
      <rect x="30" y="25" width="240" height="150" />
      <path d="M150 25v150" />
      <path d="M30 75h240" strokeWidth="1" opacity="0.4" />
      <rect x="60" y="95" width="60" height="60" stroke="var(--accent)" />
      <rect x="180" y="95" width="60" height="60" stroke="var(--accent)" />
      <path d="M30 155h240" strokeWidth="1" opacity="0.25" />
    </Frame>
  );
}

export function BalconyBlock({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема балконного блока">
      <rect x="20" y="20" width="150" height="160" />
      <path d="M95 20v160" />
      <rect x="180" y="20" width="70" height="160" />
      <path d="M180 170h70" strokeWidth="1" opacity="0.3" />
      <path d="M190 40h50" stroke="var(--accent)" />
      <path d="M190 65h50" stroke="var(--accent)" />
    </Frame>
  );
}

export function DoorGlass({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема двери со стеклом">
      <rect x="90" y="15" width="120" height="170" />
      <rect x="100" y="25" width="100" height="95" stroke="var(--accent)" />
      <path d="M150 25v95" stroke="var(--accent)" strokeWidth="1" opacity="0.5" />
      <path d="M100 130h100" strokeWidth="1" opacity="0.4" />
      <path d="M90 185h120" />
      <circle cx="196" cy="155" r="3" />
    </Frame>
  );
}

export function FacadeGrid({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема витражного фасада">
      <rect x="20" y="20" width="260" height="160" />
      <path d="M85 20v160" strokeWidth="1" />
      <path d="M150 20v160" strokeWidth="1" />
      <path d="M215 20v160" strokeWidth="1" />
      <path d="M20 100h260" strokeWidth="1" />
      <rect x="85" y="100" width="65" height="80" stroke="var(--accent)" strokeWidth="1.5" />
    </Frame>
  );
}

export function Partition({ ratio, className }: IllustrationProps) {
  return (
    <Frame ratio={ratio} className={className} label="Схема перегородки">
      <rect x="30" y="20" width="240" height="160" />
      <path d="M110 20v160" strokeWidth="1" />
      <path d="M190 20v160" strokeWidth="1" />
      <path d="M30 100h240" strokeWidth="1" opacity="0.3" />
      <rect x="30" y="20" width="80" height="160" stroke="var(--accent)" strokeWidth="1.5" />
    </Frame>
  );
}

export const ILLUSTRATIONS: Record<
  IllustrationName,
  (props: IllustrationProps) => React.ReactElement
> = {
  WindowSingle,
  WindowDouble,
  BalconyBlock,
  DoorGlass,
  FacadeGrid,
  Partition,
};

/** Open Graph картинка — тоже иллюстрация, а не фото. */
export function OgIllustration({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background: '#FFFFFF',
        borderTop: '8px solid #1F5F7A',
        fontFamily: 'sans-serif',
      }}
    >
      <svg viewBox="0 0 320 180" width="420" height="236" role="presentation">
        <g fill="none" stroke="#1F2328" strokeWidth="1.5">
          <rect x="20" y="20" width="260" height="140" />
          <path d="M85 20v140" />
          <path d="M150 20v140" />
          <path d="M215 20v140" />
          <path d="M20 90h260" />
          <rect x="85" y="90" width="65" height="70" stroke="#1F5F7A" />
        </g>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 46, fontWeight: 700, color: '#1F2328', letterSpacing: '-0.02em' }}>
          {title}
        </span>
        <span style={{ fontSize: 24, color: '#4A5360', marginTop: 12 }}>{subtitle}</span>
      </div>
    </div>
  );
}
