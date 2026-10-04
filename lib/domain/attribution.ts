/**
 * Атрибуция источника (master prompt §8.6).
 *
 * Приоритет: явный `src` → UTM → referrer → direct.
 * Явный `src` побеждает всегда: именно его мы кладём в ссылки для 2ГИС,
 * Instagram, WhatsApp-визитки и QR-кодов, чтобы владелец видел источник даже
 * когда клиент перешёл внутри приложения (там referrer не передаётся).
 */

export const SOURCE_LABELS: Record<string, string> = {
  '2gis': '2ГИС',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google',
  yandex: 'Яндекс',
  search: 'Поисковый переход',
  direct: 'Прямой заход',
  'qr-visitka': 'QR: визитка',
  'qr-zamer': 'QR: замер',
  'qr-ceh': 'QR: цех',
  referral: 'Рекомендация',
  email: 'E-mail',
};

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return SOURCE_LABELS.direct;
  return SOURCE_LABELS[source] ?? source;
}

/** Ссылки и QR-коды, которые владелец размещает на сторонних площадках (§8.6). */
export const SOURCE_LINKS = [
  { src: '2gis', label: 'Карточка 2ГИС', hint: 'Добавьте в карточку компании как сайт' },
  { src: 'instagram', label: 'Instagram', hint: 'Ссылка в шапке профиля @spf01002' },
  { src: 'whatsapp', label: 'WhatsApp-визитка', hint: 'В автоответ или описание профиля' },
  { src: 'qr-visitka', label: 'QR: визитка', hint: 'Печатные визитки и бейджи' },
  { src: 'qr-zamer', label: 'QR: замер', hint: 'Бланк замера, который заполняет мастер' },
  { src: 'qr-ceh', label: 'QR: цех', hint: 'Табличка на входе в цех и офис' },
] as const;

export interface AttributionInput {
  src?: string | null;
  utm?: Record<string, string | undefined> | null;
  referrer?: string | null;
}

export function detectSource({ src, utm, referrer }: AttributionInput): string {
  const explicit = (src || utm?.utm_source || '').toString().trim().toLowerCase();
  if (explicit) {
    const normalized = explicit.replace(/^www\./, '');
    if (normalized.includes('2gis') || normalized.includes('2гис')) return '2gis';
    if (normalized.includes('instagram') || normalized === 'ig') return 'instagram';
    if (normalized.includes('whatsapp') || normalized === 'wa') return 'whatsapp';
    if (normalized.startsWith('qr-')) return normalized;
    if (normalized.includes('google')) return 'google';
    if (normalized.includes('yandex') || normalized.includes('яндекс')) return 'yandex';
    if (SOURCE_LABELS[normalized]) return normalized;
    return normalized.slice(0, 40);
  }

  if (referrer) {
    let host = '';
    try {
      host = new URL(referrer).hostname.toLowerCase();
    } catch {
      host = referrer.toLowerCase();
    }
    if (host.includes('2gis') || host.includes('2гис')) return '2gis';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('wa.me') || host.includes('whatsapp')) return 'whatsapp';
    if (host.includes('google.')) return 'google';
    if (host.includes('yandex.')) return 'yandex';
    if (host.includes('vk.com') || host.includes('t.me')) return host.replace(/^www\./, '');
    if (host && !host.includes(process.env.SITE_HOST || '\u0000')) return 'search';
  }

  return 'direct';
}

/** Компактное определение устройства без разбора User-Agent на клиенте. */
export function detectDevice(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  const ua = (userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}
