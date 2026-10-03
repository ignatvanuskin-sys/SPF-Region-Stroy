import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { Analytics } from '@/components/Analytics';
import { ConceptBanner } from '@/components/ConceptBanner';
import { CookieNotice } from '@/components/CookieNotice';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LocalBusinessJsonLd } from '@/components/JsonLd';
import { StickyBar } from '@/components/StickyBar';
import { COMPANY_NAME, IS_CONCEPT, SITE_URL } from '@/content/site';
import { TWOGIS } from '@/content/twogis';

/**
 * Шрифт Inter, self-hosted через next/font, subsets cyrillic + cyrillic-ext.
 * Проверка казахских глифов — на странице /font-test (раздел 16.3).
 */
const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Окна, двери и фасадные витражи в Астане · СПФ Регион Строй',
    template: '%s',
  },
  description:
    'Окна и двери из металлопластика и алюминия, фасадные витражи: производство, установка, ремонт в Астане.',
  applicationName: COMPANY_NAME,
  // concept: закрываем индексацию полностью (раздел 2)
  robots: IS_CONCEPT
    ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
    : { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ru_KZ',
    siteName: COMPANY_NAME,
    url: SITE_URL,
    title: 'Окна, двери и фасадные витражи в Астане · СПФ Регион Строй',
    description:
      'Производство, установка и ремонт конструкций из металлопластика и алюминия. Расчёт после замера.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Окна, двери и фасадные витражи в Астане · СПФ Регион Строй',
    description: 'Производство, установка и ремонт конструкций из металлопластика и алюминия.',
  },
  alternates: {
    canonical: '/',
  },
  other: {
    '2gis-card': TWOGIS.firmUrl,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="font-sans antialiased">
        <a href="#content" className="skip-link">
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

        <StickyBar />
        <CookieNotice />
        <Analytics />
        <LocalBusinessJsonLd />
      </body>
    </html>
  );
}
