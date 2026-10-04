/**
 * Конфигурация сайта: подтверждённые данные компании + переменные окружения +
 * настройки из админки. Порядок приоритета — именно такой: владелец в админке
 * главнее env, env главнее значений по умолчанию из content/site.ts.
 *
 * Так владелец может поменять телефон, график, рейтинг или SLA без деплоя.
 */

import { cache } from 'react';
import { COMPANY } from '@/content/site';
import { getStore } from '@/lib/db';

export interface WorkingHours {
  /** Текст для сайта, например «Пн–Пт 09:00–18:00, Сб 10:00–15:00». */
  text: string | null;
  /** 0=вс … 6=сб — в эти дни считаем, что мы на связи. */
  workdays: number[];
  startMinutes: number;
  endMinutes: number;
}

export interface SiteConfig {
  name: string;
  legalName: string;
  slogan: string;
  city: string;
  address: string;
  addressShort: string;
  district: string;
  lat: number;
  lng: number;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappPrimary: string;
  whatsappSecondary: string;
  email: string;
  instagram: string;
  gisFirm: string;
  gisReviews: string;
  transit: { stopName: string; stopDistance: string; parking: string };
  rating: { value: number; ratingsCount: number; reviewsCount: number; photosCount: number; checkedAt: string };
  workingHours: WorkingHours;
  priceDisplay: 'off' | 'range';
  flags: { kkEnabled: boolean; aiEnabled: boolean; orderStatusPageEnabled: boolean };
  sla: { firstResponseMinutes: number; businessHoursOnly: boolean };
  notify: { emailTo: string | null; webhookUrl: string | null };
  analytics: { ymCounterId: string | null; ga4Id: string | null; metaPixelId: string | null };
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  text: null, // не подтверждено — на сайте покажем нейтральную формулировку
  workdays: [1, 2, 3, 4, 5],
  startMinutes: 9 * 60,
  endMinutes: 19 * 60,
};

/**
 * Приводит значение настройки к булеву.
 *
 * Настройки приходят из двух источников: переменные окружения (строки) и
 * таблица `settings` в БД (там уже настоящие boolean, потому что это JSON).
 * Поэтому функция принимает `unknown`, а не `string` — иначе админка падала бы
 * на первом же флаге, сохранённом как boolean.
 */
function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const configCache = cache(async (): Promise<SiteConfig> => {
  let settings: Record<string, any> = {};
  try {
    settings = await getStore().getAllSettings();
  } catch {
    settings = {};
  }

  const workingHours: WorkingHours = {
    ...DEFAULT_WORKING_HOURS,
    ...(settings.working_hours || {}),
  };

  return {
    name: settings.name || COMPANY.name,
    legalName: settings.legal_name || COMPANY.legalName,
    slogan: settings.slogan || COMPANY.slogan,
    city: settings.city || COMPANY.city,
    address: settings.address || COMPANY.address,
    addressShort: settings.address_short || COMPANY.addressShort,
    district: settings.district || COMPANY.district,
    lat: Number(settings.lat ?? COMPANY.lat),
    lng: Number(settings.lng ?? COMPANY.lng),
    phonePrimary: settings.phone_primary || process.env.PHONE_PRIMARY || COMPANY.phonePrimary,
    phoneSecondary: settings.phone_secondary || COMPANY.phoneSecondary,
    whatsappPrimary:
      settings.whatsapp_primary || process.env.WHATSAPP_PRIMARY || COMPANY.phonePrimary.replace('+', ''),
    whatsappSecondary: settings.whatsapp_secondary || process.env.WHATSAPP_SECONDARY || '77011776090',
    email: settings.email || process.env.CONTACT_EMAIL || COMPANY.email,
    instagram: settings.instagram || process.env.INSTAGRAM_URL || COMPANY.instagram,
    gisFirm: settings.gis_firm || process.env.GIS_FIRM_URL || COMPANY.gisFirm,
    gisReviews: settings.gis_reviews || process.env.GIS_REVIEWS_URL || COMPANY.gisReviews,
    transit: {
      stopName: COMPANY.transit.stopName,
      stopDistance: COMPANY.transit.stopDistance,
      parking: COMPANY.transit.parking,
    },
    rating: {
      value: Number(settings.rating?.value ?? COMPANY.rating.value),
      ratingsCount: Number(settings.rating?.ratingsCount ?? COMPANY.rating.ratingsCount),
      reviewsCount: Number(settings.rating?.reviewsCount ?? COMPANY.rating.reviewsCount),
      photosCount: Number(settings.rating?.photosCount ?? COMPANY.rating.photosCount),
      checkedAt: settings.rating?.checkedAt || COMPANY.rating.checkedAt,
    },
    workingHours,
    // Режим показа цен: значение из админки важнее переменной окружения.
    // Всё, кроме явного 'range', означает «цены не показывать».
    priceDisplay:
      (settings.price_display ?? process.env.PRICE_DISPLAY) === 'range' ? 'range' : 'off',
    flags: {
      kkEnabled: bool(settings.kk_enabled ?? process.env.KK_ENABLED, false),
      aiEnabled: bool(settings.ai_enabled ?? process.env.AI_ASSISTANT_ENABLED, false),
      orderStatusPageEnabled: bool(
        settings.order_status_page_enabled ?? process.env.ORDER_STATUS_PAGE_ENABLED,
        false,
      ),
    },
    sla: {
      firstResponseMinutes: Number(
        settings.sla?.firstResponseMinutes ?? process.env.SLA_FIRST_RESPONSE_MINUTES ?? 10,
      ),
      businessHoursOnly: settings.sla?.businessHoursOnly ?? true,
    },
    notify: {
      emailTo: settings.notify_email_to || process.env.NOTIFY_EMAIL_TO || null,
      webhookUrl: settings.notify_webhook_url || process.env.LEAD_WEBHOOK_URL || null,
    },
    analytics: {
      ymCounterId: settings.ym_counter_id || process.env.YM_COUNTER_ID || null,
      ga4Id: settings.ga4_id || process.env.GA4_ID || null,
      metaPixelId: settings.meta_pixel_id || process.env.META_PIXEL_ID || null,
    },
  };
});

export async function getSiteConfig(): Promise<SiteConfig> {
  return configCache();
}

/** Настройки, которые владелец правит в админке (ключи таблицы `settings`). */
export const EDITABLE_SETTINGS_KEYS = [
  'phone_primary',
  'phone_secondary',
  'whatsapp_primary',
  'whatsapp_secondary',
  'email',
  'instagram',
  'address',
  'working_hours',
  'rating',
  'price_display',
  'sla',
  'notify_email_to',
  'notify_webhook_url',
  'ym_counter_id',
  'ga4_id',
  'meta_pixel_id',
  'kk_enabled',
  'ai_enabled',
  'order_status_page_enabled',
] as const;

/**
 * В рабочее ли время пришла заявка. Используется SLA (§8.4): вне рабочих часов
 * уведомление уходит «тихо», а не эскалируется ночью.
 */
export function isWithinWorkingHours(
  date: Date,
  hours: WorkingHours,
  timeZone = 'Asia/Almaty',
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);

  const weekdayName = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[weekdayName] ?? 1;

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  const minutes = hour * 60 + minute;

  return (
    hours.workdays.includes(weekday) && minutes >= hours.startMinutes && minutes < hours.endMinutes
  );
}
