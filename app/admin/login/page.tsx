import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from '@/components/admin/login-form';
import { BrandMark } from '@/components/site/header';
import { loginAction } from '@/app/admin/actions';

export const metadata: Metadata = {
  title: 'Вход в админку',
  robots: { index: false, follow: false },
};

/** Вход в админку (§9). Без сессии все разделы /admin недоступны. */
export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect('/admin');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark />
          <div>
            <p className="text-sm font-extrabold tracking-tight">СПФ Регион Строй</p>
            <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Панель управления
            </p>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-bold tracking-tight">Вход</h1>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
            Доступ только для сотрудников компании.
          </p>
          <LoginForm action={loginAction} />
        </div>

        <p className="mt-4 text-center text-[0.75rem] text-[var(--color-ink-muted)]">
          Забыли пароль? Восстановление пароля настраивается владельцем вручную — см. docs/OWNER_GUIDE.md.
        </p>
      </div>
    </div>
  );
}
