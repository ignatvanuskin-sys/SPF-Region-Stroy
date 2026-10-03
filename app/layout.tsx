import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

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
 * Типографика дизайн-системы (см. design-system/spf-region-stroy/MASTER.md):
 * Inter — весь интерфейс, Playfair Display italic — только крупные акценты
 * (цифра доверия, pull-quote).
 */
const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-display',
  weight: ['500'],
  style: ['italic'],
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
  alternates: { canonical: '/' },
  other: { '2gis-card': TWOGIS.firmUrl },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
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
