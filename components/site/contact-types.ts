/** Общий срез контактов, который серверные страницы передают в компоненты. */
export interface Contacts {
  name: string;
  phonePrimary: string;
  phoneSecondary: string;
  whatsappPrimary: string;
  whatsappSecondary: string;
  email: string;
  instagram: string;
  gisFirm: string;
  gisReviews: string;
  address: string;
  addressShort: string;
  workingHoursText: string | null;
  rating: { value: number; ratingsCount: number; checkedAt: string };
}

export function formatTel(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return phone;
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}
