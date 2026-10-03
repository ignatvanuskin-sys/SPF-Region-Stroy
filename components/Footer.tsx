import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { COMPANY_NAME, KK_ENABLED } from '@/content/site';
import { CONTACTS } from '@/content/contacts';
import { COMMENT_BIN } from '@/content/facts';
import { TWOGIS } from '@/content/twogis';
import { NOTES } from '@/content/notes';
import { MarkerText } from '@/components/MarkerText';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { telLink } from '@/lib/whatsapp';

/**
 * Подвал.
 *
 * Instagram намеренно не выводится: ссылка есть в карточке 2ГИС, но профиль
 * при прямой проверке недоступен. Показывать нерабочий канал нельзя —
 * вернуть после подтверждения владельцем.
 * Режим работы показывается маркером: график в карточке не получен.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-border bg-secondary/50">
      <div className="shell grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="font-display text-[18px] font-semibold">{COMPANY_NAME}</p>
          <p className="mt-3 max-w-[36ch] text-[15px] text-muted-foreground">
            Окна ПВХ, алюминиевые конструкции и фасадные витражи. Производство, продажа,
            установка и ремонт.
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            <MarkerText text={COMMENT_BIN} />
          </p>
        </div>

        <nav aria-label="Услуги" className="md:col-span-3">
          <p className="font-display text-[15px] font-semibold">Услуги</p>
          <ul className="mt-3.5 space-y-2.5 text-[15px]">
            {[
              ['/plastikovye-okna', 'Пластиковые окна'],
              ['/alyuminievye-okna-i-dveri', 'Алюминиевые окна и двери'],
              ['/dveri', 'Двери'],
              ['/osteklenie-balkona', 'Остекление балкона'],
              ['/fasadnoe-ostekleniye', 'Фасадное остекление'],
              ['/ustanovka-i-remont-okon', 'Установка и ремонт'],
            ].map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-3">
          <p className="font-display text-[15px] font-semibold">Контакты</p>
          <ul className="mt-3.5 space-y-3.5 text-[15px]">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-muted-foreground">{CONTACTS.addressFull}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a
                href={telLink()}
                className="tnum text-muted-foreground transition-colors duration-200 hover:text-primary"
                data-analytics="click_phone"
                data-placement="footer"
              >
                {CONTACTS.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MessageCircle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a
                href={CONTACTS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                data-analytics="click_whatsapp"
                data-placement="footer"
              >
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a
                href={CONTACTS.emailHref}
                className="break-all text-muted-foreground transition-colors duration-200 hover:text-primary"
                data-analytics="click_email"
                data-placement="footer"
              >
                {CONTACTS.email}
              </a>
            </li>
            <li className="text-[13px] text-muted-foreground">
              Режим работы: <MarkerText text={NOTES.responseTime} />
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="font-display text-[15px] font-semibold">Документы</p>
          <ul className="mt-3.5 space-y-2.5 text-[15px]">
            <li>
              <Link
                href="/privacy"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Персональные данные
              </Link>
            </li>
            <li>
              <Link
                href="/kontakty"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Контакты
              </Link>
            </li>
            <li>
              <Link
                href="/portfolio"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Наши работы
              </Link>
            </li>
            <li>
              <a
                href={TWOGIS.firmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
                data-analytics="click_2gis"
                data-placement="footer"
              >
                2ГИС
              </a>
            </li>
          </ul>

          <div className="mt-4 text-[15px]">
            <LanguageSwitcher kkEnabled={KK_ENABLED} />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-6">
          <p className="text-[13px] text-muted-foreground">
            © {year} {COMPANY_NAME}. Все права защищены.
          </p>
          <p className="text-[13px] text-muted-foreground">
            Точная стоимость и сроки подтверждаются после замера.
          </p>
        </div>
      </div>
    </footer>
  );
}
