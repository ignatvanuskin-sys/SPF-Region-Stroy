import type { SiteConfig } from '@/lib/domain/settings';
import type { Contacts } from '@/components/site/contact-types';

/** Приводит конфигурацию сайта к тому срезу, который нужен компонентам. */
export function toContacts(config: SiteConfig): Contacts {
  return {
    name: config.name,
    phonePrimary: config.phonePrimary,
    phoneSecondary: config.phoneSecondary,
    whatsappPrimary: config.whatsappPrimary,
    whatsappSecondary: config.whatsappSecondary,
    email: config.email,
    instagram: config.instagram,
    gisFirm: config.gisFirm,
    gisReviews: config.gisReviews,
    address: config.address,
    addressShort: config.addressShort,
    workingHoursText: config.workingHours.text,
    rating: {
      value: config.rating.value,
      ratingsCount: config.rating.ratingsCount,
      checkedAt: config.rating.checkedAt,
    },
  };
}
