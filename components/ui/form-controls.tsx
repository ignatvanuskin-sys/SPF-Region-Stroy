import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Поля формы. Ключевые решения по доступности и мобильным устройствам:
 *  • каждый input связан со своим <label htmlFor> — placeholder не заменяет
 *    подпись (anti-pattern из ui-ux-pro-max);
 *  • текст ≥ 16 px — iOS не зумит страницу при фокусе;
 *  • ошибка связана через aria-describedby и aria-invalid, а не только цветом;
 *  • высота полей ≥ 44 px — палец не промахивается.
 */

const controlBase =
  'w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-alt)]';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'min-h-11',
        invalid
          ? 'border-[var(--color-danger)] focus-visible:outline-[var(--color-danger)]'
          : 'border-[var(--color-line-strong)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'min-h-28 resize-y',
        invalid
          ? 'border-[var(--color-danger)] focus-visible:outline-[var(--color-danger)]'
          : 'border-[var(--color-line-strong)]',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        controlBase,
        'min-h-11 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10',
        invalid
          ? 'border-[var(--color-danger)] focus-visible:outline-[var(--color-danger)]'
          : 'border-[var(--color-line-strong)]',
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7178' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('block text-sm font-semibold text-[var(--color-ink)]', className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-[var(--color-danger)]" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}

/**
 * Обёртка поля: подпись, подсказка, сообщение об ошибке.
 * `role="alert"` на ошибке — скринридер озвучит её сразу после отправки.
 */
export function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            'aria-describedby': describedBy,
          })
        : children}
      {hint && !error ? (
        <p id={hintId} className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.8125rem] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string | null;
}

/**
 * Чекбокс с крупной зоной нажатия. Согласие на обработку ПД по умолчанию
 * выключено — предзаполненная галочка не считается согласием (§15).
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-[var(--radius-xs)] border-[var(--color-line-strong)] accent-[var(--color-glass)]"
          {...props}
        />
        <label htmlFor={id} className="cursor-pointer text-[0.875rem] leading-snug text-[var(--color-ink-soft)]">
          {label}
        </label>
      </div>
      {error ? (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-[0.8125rem] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  ),
);
Checkbox.displayName = 'Checkbox';
