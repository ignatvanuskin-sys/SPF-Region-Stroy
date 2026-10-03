import { ImageResponse } from 'next/og';

import { COMPANY_NAME } from '@/content/site';

/**
 * Open Graph картинка (раздел 16.6): сгенерированная иллюстрация с названием
 * компании, а не фотография.
 * Шрифт подгружается из Google Fonts только на этапе сборки — в браузер
 * пользователя ничего лишнего не уходит.
 */
export const alt = 'СПФ Регион Строй — окна, двери и фасадные витражи в Астане';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadInter(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap&subset=cyrillic',
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then((r) => (r.ok ? r.text() : ''));

    const url = css.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!url) return null;

    const font = await fetch(url);
    if (!font.ok) return null;
    return await font.arrayBuffer();
  } catch {
    // Без сети остаётся системный шрифт: картинка соберётся, но подпись
    // может отрисоваться заменой глифов. Это заметно и в отчёте.
    return null;
  }
}

export default async function Image() {
  const fontData = await loadInter();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#FFFFFF',
          borderTop: '10px solid #1F5F7A',
          fontFamily: fontData ? 'Inter' : 'sans-serif',
        }}
      >
        <svg width="380" height="214" viewBox="0 0 320 180">
          <g fill="none" stroke="#1F2328" strokeWidth="1.5">
            <rect x="20" y="20" width="260" height="140" />
            <path d="M85 20v140" />
            <path d="M150 20v140" />
            <path d="M215 20v140" />
            <path d="M20 90h260" />
            <rect x="85" y="90" width="65" height="70" stroke="#1F5F7A" />
          </g>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 58, fontWeight: 600, color: '#1F2328', letterSpacing: '-0.02em' }}>
            {COMPANY_NAME}
          </div>
          <div style={{ fontSize: 30, color: '#4A5360', marginTop: 14 }}>
            Окна, двери и фасадные витражи · Астана
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'Inter', data: fontData, style: 'normal' as const, weight: 600 as const }]
        : undefined,
    },
  );
}
