'use client';

import * as React from 'react';
import Script from 'next/script';
import { captureAttribution, getSessionId, hasAnalyticsConsent, track } from '@/lib/tracking';

export interface AnalyticsIds {
  ym: string | null;
  ga4: string | null;
  meta: string | null;
}

/**
 * Аналитика (§14).
 *
 * Первый визит: считываем источник и UTM и фиксируем `page_view`.
 * Сторонние счётчики (Яндекс.Метрика, GA4, Meta Pixel) грузятся лениво и
 * ТОЛЬКО после согласия на cookie — при отказе счётчики не подключаются вовсе.
 */
export function Analytics({ ids }: { ids: AnalyticsIds }) {
  const [consented, setConsented] = React.useState(false);

  React.useEffect(() => {
    captureAttribution();
    setConsented(hasAnalyticsConsent());
    track('page_view', { path: window.location.pathname, session: getSessionId() });

    const onConsent = () => setConsented(hasAnalyticsConsent());
    window.addEventListener('spf:consent', onConsent);
    return () => window.removeEventListener('spf:consent', onConsent);
  }, []);

  if (!consented) return null;

  return (
    <>
      {ids.ym ? (
        <Script id="ym-init" strategy="lazyOnload">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${JSON.stringify(ids.ym)}, "init", {clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
        </Script>
      ) : null}

      {ids.ga4 ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ids.ga4}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config', ${JSON.stringify(ids.ga4)}, {anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {ids.meta ? (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(ids.meta)});fbq('track', 'PageView');`}
        </Script>
      ) : null}
    </>
  );
}
