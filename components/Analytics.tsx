'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

import { GA_ID, YM_ID } from '@/content/site';
import { captureUtm, readUtm } from '@/lib/utm';

type ConsentState = 'accepted' | 'declined' | null;

/**
 * Аналитика (раздел 20).
 * Ничего не загружается, пока пользователь не нажал «Принять»:
 * отказ полностью отключает аналитику.
 */
export function Analytics() {
  const [consent, setConsentState] = useState<ConsentState>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    captureUtm();
    try {
      const stored = window.localStorage.getItem('spf_cookie_consent');
      setConsentState(stored === 'accepted' || stored === 'declined' ? stored : null);
    } catch {
      setConsentState(null);
    }

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ConsentState>).detail;
      setConsentState(detail ?? 'declined');
    };
    window.addEventListener('spf:consent', onChange);
    return () => window.removeEventListener('spf:consent', onChange);
  }, []);

  if (!mounted || consent !== 'accepted') return null;

  const utm = readUtm();

  return (
    <>
      {GA_ID && (
        <>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              window.__spfGaId = ${JSON.stringify(GA_ID)};
              gtag('js', new Date());
              gtag('config', ${JSON.stringify(GA_ID)}, { anonymize_ip: true });
              ${utm.utm_source ? `gtag('set', 'campaign', { source: ${JSON.stringify(utm.utm_source)} });` : ''}
            `}
          </Script>
        </>
      )}

      {YM_ID && (
        <Script id="ym-init" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            window.__spfYmId = ${JSON.stringify(YM_ID)};
            ym(${Number(YM_ID)}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false });
          `}
        </Script>
      )}
    </>
  );
}
