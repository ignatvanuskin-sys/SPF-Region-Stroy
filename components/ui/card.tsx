import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Карточка — базовый контейнер контента. Держим минимальный набор частей,
 * чтобы вёрстка оставалась единообразной: Card / CardHeader / CardTitle /
 * CardDescription / CardContent / CardFooter.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, as: Tag = 'h3', ...props }: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return <Tag className={cn('text-lg font-bold tracking-tight text-[var(--color-ink)]', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] px-5 py-4 sm:px-6', className)}
      {...props}
    />
  );
}

/** Секция страницы с едиными вертикальными отступами. */
export function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) {
  return (
    <section className={cn('py-14 sm:py-20', className)} {...props}>
      {children}
    </section>
  );
}

/** Заголовок секции: надзаголовок, h2 и пояснение — один ритм на всём сайте. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: Tag = 'h2',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  as?: React.ElementType;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <p className="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-glass)]">
          {eyebrow}
        </p>
      ) : null}
      <Tag className="text-[1.75rem] font-bold sm:text-4xl">{title}</Tag>
      {description ? (
        <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-soft)] sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
