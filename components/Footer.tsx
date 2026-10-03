import Link from 'next/link';
import { AtSign, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

import { COMPANY_NAME, KK_ENABLED } from '@/content/site';
import { CONTACTS } from '@/content/contacts';
import { COMMENT_BIN } from '@/content/facts';
import { TWOGIS } from '@/content/twogis';
import { MarkerText } from '@/components/MarkerText';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { telLink } from '@/lib/whatsapp';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-border bg-muted/40">
      <div className="shell grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="text-[17px] font-semibold">{COMPANY_NAME}</p>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Окна, двери и фасадные витражи из металлопластика и алюминия. Производство, установка,
            ремонт.
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            <MarkerText text={COMMENT_BIN} />
          </p>
        </div>

        <div>
          <p className="text-[15px] font-semibold">Услуги</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {[
              ['/plastikovye-okna', 'Пластиковые окна'],
              ['/alyuminievye-okna-i-dveri', 'Алюминиевые окна и двери'],
              ['/dveri', 'Двери'],
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
        </div>

        <div>
          <p className="text-[15px] font-semibold">Контакты</p>
          <ul className="mt-3 space-y-3 text-[15px]">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">
                {CONTACTS.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={telLink()}
                className="tnum text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {CONTACTS.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MessageCircle
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <a
                href={CONTACTS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={CONTACTS.emailHref}
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {CONTACTS.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <AtSign className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a
                href={CONTACTS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                {CONTACTS.instagramHandle}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[15px] font-semibold">Документы</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link
                href="/privacy"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Политика конфиденциальности
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
              <a
                href={TWOGIS.firmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors duration-200 hover:text-primary"
              >
                Карточка в 2ГИС
              </a>
            </li>
          </ul>

          <div className="mt-4 text-[15px]">
            <LanguageSwitcher kkEnabled={KK_ENABLED} />
          </div>

          <p className="mt-6 text-[12px] text-muted-foreground">{TWOGIS.asOfLabel}</p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="shell flex flex-wrap items-center justify-between gap-3 py-6">
          <p className="text-[13px] text-muted-foreground">
            © {year} {COMPANY_NAME}. Все права защищены.
          </p>
          <p className="text-[13px] text-muted-foreground">
            Сроки и стоимость подтверждаются после замера.
          </p>
        </div>
      </div>
    </footer>
  );
}
