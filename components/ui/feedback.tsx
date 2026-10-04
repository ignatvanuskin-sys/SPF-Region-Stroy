import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Бейджи, сообщения и состояния. Правило доступности: смысл никогда не
 * передаётся одним цветом — рядом всегда есть текст («Отказ», «Спам» и т. д.).
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] text-[var(--color-ink-soft)]',
        info: 'border-transparent bg-[var(--color-glass-soft)] text-[var(--color-glass-deep)]',
        progress: 'border-transparent bg-[#eef2ff] text-[#3730a3]',
        success: 'border-transparent bg-[#e7f5ee] text-[#14603a]',
        danger: 'border-transparent bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
        warning: 'border-transparent bg-[#fef3e2] text-[var(--color-warning)]',
        cta: 'border-transparent bg-[var(--color-cta-soft)] text-[var(--color-cta-hover)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const alertVariants = cva('flex gap-3 rounded-[var(--radius-md)] border p-4 text-sm leading-relaxed', {
  variants: {
    tone: {
      info: 'border-[var(--color-glass-soft)] bg-[var(--color-glass-soft)] text-[var(--color-glass-deep)]',
      success: 'border-[#bfe3d0] bg-[#eefaf3] text-[#14603a]',
      warning: 'border-[#f3d9ae] bg-[#fef7ec] text-[#7c3e0a]',
      danger: 'border-[#f3c6c2] bg-[var(--color-danger-soft)] text-[#8a1f19]',
      neutral: 'border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[var(--color-ink-soft)]',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Роль по умолчанию: ошибки и успех объявляются сразу. */
  live?: boolean;
}

export function Alert({ className, tone, live, children, ...props }: AlertProps) {
  return (
    <div
      className={cn(alertVariants({ tone }), className)}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function Spinner({ className, label = 'Загрузка' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-[var(--color-glass)] border-t-transparent',
        className,
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-alt)]', className)} />;
}

/**
 * Пустое состояние. По §7 блок без данных не заполняется заглушками —
 * он либо скрыт, либо объясняет, что появится позже.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-alt)] p-8 text-center',
        className,
      )}
    >
      <p className="font-semibold text-[var(--color-ink)]">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm text-[var(--color-ink-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
