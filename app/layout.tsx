import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';

import './globals.css';
import { Analytics } from '@/components/Analytics';
import { ActionBar } from '@/components/ActionBar';
import { ConceptBanner } from '@/components/ConceptBanner';
import { CookieNotice } from '@/components/CookieNotice';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LocalBusinessJsonLd } from '@/components/JsonLd';
import { COMPANY_NAME, IS_CONCEPT, SITE_URL } from '@/content/site';
import { TWOGIS } from '@/content/twogis';

/**
 * Пара шрифтов бренда: Manrope — заголовки (современный grotesk),
 * Inter — интерфейс и текст. Больше шрифтов на сайте нет.
 */
const manrope = Manrope({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Окна, двери и фасадное остекление в Астане — СПФ Регион Строй',
    template: '%s',
  },
  description:
    'Окна ПВХ, алюминиевые окна и двери, фасадные витражи, установка и ремонт в Астане. Получите консультацию и предварительный расчет.',
  applicationName: COMPANY_NAME,
  robots: IS_CONCEPT
    ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
    : { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    siteName: COMPANY_NAME,
    url: SITE_URL,
    title: 'Окна, двери и фасадное остекление в Астане — СПФ Регион Строй',
    description:
      'Подберем решение под ваш объект, подготовим предварительный расчет и поможем организовать замер.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Окна, двери и фасадное остекление в Астане — СПФ Регион Строй',
    description:
      'Окна ПВХ, алюминиевые конструкции, фасадные витражи. Установка и ремонт в Астане.',
  },
  alternates: { canonical: '/' },
  other: { '2gis-card': TWOGIS.firmUrl },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F6F2',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${inter.variable}`}>
      <body className="font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
        >
          Перейти к содержимому
        </a>

        <ConceptBanner />

        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>

        <ActionBar />
        <CookieNotice />
        <Analytics />
        <LocalBusinessJsonLd />
      </body>
    </html>
  );
}
