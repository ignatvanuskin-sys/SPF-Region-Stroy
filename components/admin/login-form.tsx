'use client';

import { useActionState } from 'react';
import { Alert } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import type { ActionResult } from '@/components/admin/action-form';

/**
 * Форма входа. Ответ сервера одинаков для «нет такого пользователя» и «неверный
 * пароль» — так мы не подсказываем, какие адреса зарегистрированы.
 *
 * Серверное действие передаётся пропом: это единственный способ вызвать его из
 * клиентского компонента без дублирования логики.
 */
export function LoginForm({
  action,
}: {
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <Field id="login-email" label="E-mail" required>
        <Input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          placeholder="owner@example.kz"
        />
      </Field>

      <Field id="login-password" label="Пароль" required>
        <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>

      {state && !state.ok ? (
        <Alert tone="danger" live>
          {state.message}
        </Alert>
      ) : null}
      {state && state.ok ? (
        <Alert tone="success" live>
          {state.message}
        </Alert>
      ) : null}

      <Button type="submit" variant="primary" size="lg" block loading={pending}>
        {pending ? 'Проверяем…' : 'Войти'}
      </Button>
    </form>
  );
}
