'use client';

import Link from 'next/link';

import { isLanguageSwitcherVisible } from '@/lib/i18n';
import { track } from '@/lib/analytics';

/**
 * Переключатель языка появляется только при KK_ENABLED=true
 * И полностью заполненном казахском словаре (раздел 18).
 * Редиректов по IP нет — только явное нажатие.
 *
 * Флаг приходит пропсом от серверного компонента: process.env на клиенте
 * недоступен, а читать его в клиентском компоненте нельзя — это ломает
 * гидратацию (разный HTML на сервере и клиенте).
 */
export function LanguageSwitcher({ kkEnabled }: { kkEnabled: boolean }) {
  if (!isLanguageSwitcherVisible(kkEnabled)) return null;

  return (
    <Link
      href="/kk"
      hrefLang="kk"
      className="text-[15px] text-[color:var(--accent)] underline underline-offset-2"
      onClick={() => track('lang_switch', { to: 'kk' })}
    >
      Қазақша
    </Link>
  );
}
