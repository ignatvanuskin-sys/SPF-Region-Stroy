import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { Input, Label } from '@/components/ui/form-controls';
import { ActionForm } from '@/components/admin/action-form';
import { changePasswordAction } from '@/app/admin/actions';
import { getCurrentUser } from '@/lib/session';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Смена пароля (§9).
 *
 * Отдельная страница, а не модальное окно: пароль — важное действие, и лучше,
 * чтобы владелец попадал сюда осознанно. При первом входе в админке показывается
 * предупреждение, ведущее на эту страницу.
 */
export default async function PasswordPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Смена пароля</h1>
        <p className="mt-1 text-[0.875rem] text-[var(--color-ink-muted)]">
          {user?.email}
          {user?.last_login_at ? ` · последний вход ${formatDateTime(user.last_login_at)}` : ''}
        </p>
      </div>

      {user?.must_change_password ? (
        <Alert tone="warning">
          Вы вошли с временным паролем. Смените его сейчас — до этого момента доступ к заявкам клиентов
          защищён слабее.
        </Alert>
      ) : null}

      <Card className="max-w-lg p-5">
        <ActionForm action={changePasswordAction} submitLabel="Сменить пароль" variant="primary">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current" required>
                Текущий пароль
              </Label>
              <Input id="pw-current" name="current_password" type="password" autoComplete="current-password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new" required>
                Новый пароль
              </Label>
              <Input
                id="pw-new"
                name="new_password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
              />
              <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                Минимум 10 символов. Хороший пароль — три-четыре несвязанных слова.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-repeat" required>
                Повторите новый пароль
              </Label>
              <Input id="pw-repeat" name="repeat_password" type="password" autoComplete="new-password" required />
            </div>
          </div>
        </ActionForm>
      </Card>

      <Card className="max-w-lg p-5">
        <p className="font-bold">Выход на всех устройствах</p>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
          Сессия подписана секретом SESSION_SECRET и живёт 7 дней. Если вы сменили SESSION_SECRET на
          сервере, все входы в админку разом перестают действовать — это самый простой способ выгнать
          всех, если устройство потерялось.
        </p>
      </Card>
    </div>
  );
}
