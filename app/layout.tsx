import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

/**
 * Корневой макет: только `<html>`, шрифт и метаданные.
 *
 * Публичная «обвязка» (шапка, подвал, закреплённая панель на мобильном, баннер
 * согласия) живёт в `app/(site)/layout.tsx`. Такое разделение сделано осознанно:
 * админка — отдельный интерфейс, и она не должна наследовать публичную навигацию,
 * которая тянет за собой контакты, рейтинг и аналитику.
 *
 * Manrope — современный гротеск с полноценной кириллицей. Подключаем subset
 * cyrillic-ext: там лежат казахские ә, ғ, қ, ң, ө, ұ, ү, һ, і — они понадобятся
 * в фазе 2 (KK_ENABLED). Шрифт самохостится через next/font: нет внешних
 * запросов и нет сдвига вёрстки при загрузке.
 */
const manrope = Manrope({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Окна, двери и фасадные витражи в Астане — СПФ Регион Строй',
    template: '%s — СПФ Регион Строй, Астана',
  },
  description:
    'Металлопластиковые и алюминиевые окна, входные двери, фасадные витражи и перегородки в Астане. Производство, доставка, монтаж. Замер на объекте.',
  applicationName: 'СПФ Регион Строй',
  formatDetection: { telephone: true, address: true, email: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf8f5',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
