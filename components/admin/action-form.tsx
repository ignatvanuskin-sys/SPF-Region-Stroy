'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionResult {
  ok: boolean;
  message: string;
}

type ServerAction = (formData: FormData) => Promise<ActionResult>;

/**
 * Форма админки поверх серверного действия.
 *
 * Даёт обратную связь там, где она нужна («статус обновлён», «фото загружено»)
 * и блокирует кнопку, пока запрос идёт. Сообщение выводится с `role="status"`,
 * поэтому скринридер озвучит его без перевода фокуса.
 *
 * Если серверное действие вернуло сообщение с кодом приглашения или временным
 * паролем, оно показывается целиком — владельцу нужно его скопировать.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = 'Сохраняем…',
  variant = 'primary',
  size = 'md',
  className,
  buttonClassName,
  hidden,
  confirm,
  compact,
}: {
  action: ServerAction;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: 'primary' | 'cta' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  buttonClassName?: string;
  /** Скрытые поля формы: id записи, ключ и т. п. */
  hidden?: Record<string, string | number | boolean | undefined>;
  /** Текст подтверждения перед отправкой — для удаления данных. */
  confirm?: string;
  /** Компактный режим: без сообщения, только кнопка (для форм в таблицах). */
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className={className}>
      {hidden
        ? Object.entries(hidden).map(([key, value]) =>
            value === undefined ? null : (
              <input key={key} type="hidden" name={key} value={value ? '1' : '0'} />
            ),
          )
        : null}

      {children}

      <Button
        type="submit"
        variant={variant}
        size={size}
        loading={pending}
        className={cn(!compact && 'mt-1', buttonClassName)}
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>

      {!compact && state && state.message ? (
        <Alert tone={state.ok ? 'success' : 'danger'} live className="mt-3">
          <span className="break-anywhere">{state.message}</span>
        </Alert>
      ) : null}
    </form>
  );
}

/**
 * Вариант для кнопок внутри таблицы: без текста сообщения, чтобы не ломать
 * сетку. Результат всё равно видно — строка обновится после revalidatePath.
 */
export function InlineActionForm({
  action,
  submitLabel,
  hidden,
  variant = 'ghost',
  confirm,
  title,
}: {
  action: ServerAction;
  submitLabel: string;
  hidden?: Record<string, string | number | boolean | undefined>;
  variant?: 'primary' | 'cta' | 'outline' | 'ghost' | 'danger';
  confirm?: string;
  title?: string;
}) {
  const [, formAction, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className="inline">
      {hidden
        ? Object.entries(hidden).map(([key, value]) =>
            value === undefined ? null : (
              <input key={key} type="hidden" name={key} value={value ? '1' : '0'} />
            ),
          )
        : null}
      <Button
        type="submit"
        variant={variant}
        size="sm"
        loading={pending}
        title={title}
        onClick={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
