import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  CalendarClock,
  ExternalLink,
  Image as ImageIcon,
  KeyRound,
  Link2,
  LogOut,
  MessageSquareQuote,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { logoutAction } from '@/app/admin/actions';
import { getStore } from '@/lib/db';
import { Badge } from '@/components/ui/feedback';
import { BrandMark } from '@/components/site/header';
import { LEAD_STATUS_LABELS } from '@/lib/domain/statuses';

export const metadata: Metadata = {
  title: 'Админка',
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  { href: '/admin', label: 'Обзор', Icon: BarChart3 },
  { href: '/admin/leads', label: 'Заявки', Icon: Users },
  { href: '/admin/measurements', label: 'Замеры', Icon: CalendarClock },
  { href: '/admin/gallery', label: 'Галерея', Icon: ImageIcon },
  { href: '/admin/reviews', label: 'Отзывы', Icon: MessageSquareQuote },
  { href: '/admin/claims', label: 'Утверждения', Icon: ScrollText },
  { href: '/admin/links', label: 'Ссылки и QR', Icon: Link2 },
  { href: '/admin/notifications', label: 'Журнал', Icon: ShieldCheck },
  { href: '/admin/settings', label: 'Настройки', Icon: Settings },
  { href: '/admin/password', label: 'Пароль', Icon: KeyRound },
];

/**
 * Оболочка админки (§9).
 *
 * Доступ проверяется здесь, до отрисовки страницы: без активной сессии — сразу
 * на форму входа. Интерфейс крупный и адаптивный, потому что владелец часто
 * открывает его с телефона.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  const store = getStore();
  const [newLeads, pendingMeasurements, finalClaims, notifications] = await Promise.all([
    store.countLeads({ status: ['new'] }),
    store.listMeasurements({ from: new Date().toISOString() }),
    store.listClaims(),
    store.listNotifications(100),
  ]);

  const unconfirmedClaims = finalClaims.filter((claim) => claim.status === 'unconfirmed').length;
  const undelivered = notifications.filter((item) => item.status === 'failed').length;
  const pendingMeasurementsCount = pendingMeasurements.filter((item) => item.status === 'pending').length;

  const roleLabel = user.role === 'owner' ? 'Владелец' : user.role === 'manager' ? 'Менеджер' : 'Просмотр';

  return (
    <div className="min-h-screen bg-[var(--color-surface-alt)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="text-sm font-extrabold tracking-tight">СПФ Регион Строй</p>
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Панель управления
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden text-right sm:block">
              <p className="text-[0.8125rem] font-semibold">{user.name || user.email}</p>
              <p className="text-[0.6875rem] text-[var(--color-ink-muted)]">{roleLabel}</p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] px-3 text-[0.8125rem] font-medium transition-colors hover:border-[var(--color-ink)]"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Сайт
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-3 text-[0.8125rem] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-alt)]"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Выйти
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Разделы админки" className="border-t border-[var(--color-line)]">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-5">
            {NAV_ITEMS.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 text-[0.8125rem] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]"
                >
                  <Icon className="size-4 shrink-0 text-[var(--color-glass)]" aria-hidden="true" />
                  {label}
                  {label === 'Заявки' && newLeads > 0 ? <Badge tone="danger">{newLeads}</Badge> : null}
                  {label === 'Замеры' && pendingMeasurementsCount > 0 ? (
                    <Badge tone="warning">{pendingMeasurementsCount}</Badge>
                  ) : null}
                  {label === 'Утверждения' && unconfirmedClaims > 0 ? (
                    <Badge tone="neutral">{unconfirmedClaims}</Badge>
                  ) : null}
                  {label === 'Журнал' && undelivered > 0 ? <Badge tone="danger">{undelivered}</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Предупреждение о неотправленных уведомлениях — на всех страницах админки. */}
      {undelivered > 0 ? (
        <div className="border-b border-[#f3c6c2] bg-[var(--color-danger-soft)]">
          <div className="mx-auto max-w-7xl px-4 py-2.5 text-[0.8125rem] text-[#8a1f19] sm:px-6">
            <strong>{undelivered}</strong> уведомлений не доставлено менеджеру. Заявки сохранены —
            смотрите раздел «Журнал» и проверьте настройки Telegram.
          </div>
        </div>
      ) : null}

      {user.must_change_password ? (
        <div className="border-b border-[#f3d9ae] bg-[#fef7ec]">
          <div className="mx-auto max-w-7xl px-4 py-2.5 text-[0.8125rem] text-[#7c3e0a] sm:px-6">
            Вы вошли с временным паролем.{' '}
            <Link href="/admin/password" className="font-semibold underline underline-offset-2">
              Смените пароль
            </Link>
            , чтобы защитить доступ к заявкам клиентов.
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-[0.75rem] text-[var(--color-ink-muted)] sm:px-6">
        {LEAD_STATUS_LABELS.new === 'Новая' ? null : null}
        Данные клиентов видны только сотрудникам. При увольнении сотрудника удалите его из раздела
        «Настройки» и из Telegram-чата.
      </footer>
    </div>
  );
}
