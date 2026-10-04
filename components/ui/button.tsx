import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * shadcn-подход: варианты через cva, классы прокидываются наружу.
 *
 * Доступность: минимальная зона нажатия 44 px по высоте (h-11), видимый фокус
 * (глобальный :focus-visible), `cursor-pointer` на всех кликабельных элементах.
 * Один яркий CTA-цвет — только у варианта `cta`, чтобы взгляд всегда находил
 * главное действие.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-semibold transition-colors duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        cta: 'bg-[var(--color-cta)] text-[var(--color-cta-ink)] hover:bg-[var(--color-cta-hover)] shadow-[0_1px_2px_rgb(20_24_28/0.08)]',
        primary: 'bg-[var(--color-ink)] text-[var(--color-bg)] hover:bg-[var(--color-ink-soft)]',
        glass: 'bg-[var(--color-glass)] text-white hover:bg-[var(--color-glass-deep)]',
        outline:
          'border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]',
        ghost: 'text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]',
        link: 'text-[var(--color-glass)] underline-offset-4 hover:underline p-0 h-auto',
        danger: 'bg-[var(--color-danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-10 px-3.5 text-sm',
        md: 'h-11 px-5 text-[0.95rem]',
        lg: 'h-13 px-6 text-base',
        icon: 'h-11 w-11',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Показывает индикатор и блокирует повторную отправку. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/** Ссылка, выглядящая как кнопка: тот же набор вариантов, но это <a>. */
export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, block, ...props }, ref) => (
    <a ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  ),
);
ButtonLink.displayName = 'ButtonLink';

export { buttonVariants };
