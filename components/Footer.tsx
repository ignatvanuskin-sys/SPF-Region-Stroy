import Link from 'next/link';

import { COMPANY_NAME, KK_ENABLED } from '@/content/site';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CONTACTS } from '@/content/contacts';
import { COMMENT_BIN } from '@/content/facts';
import { TWOGIS } from '@/content/twogis';
import { MarkerText } from '@/components/MarkerText';
import { ExternalLink } from '@/components/Cta';
import { telLink } from '@/lib/whatsapp';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-[color:var(--line)] bg-[color:var(--bg-alt)] py-12">
      <div className="container-page grid gap-10 md:grid-cols-3">
        <div>
          <p className="text-[17px] font-semibold">{COMPANY_NAME}</p>
          <p className="mt-3 text-[15px] text-[color:var(--ink-2)]">
            {CONTACTS.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="mt-3 text-[14px] text-[color:var(--muted)]">
            <MarkerText text={COMMENT_BIN} />
          </p>
        </div>

        <div>
          <p className="text-[15px] font-semibold">Связаться</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <a
                href={telLink()}
                className="tnum text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                {CONTACTS.phone}
              </a>
            </li>
            <li>
              <ExternalLink
                href={CONTACTS.whatsapp}
                placement="footer"
                event="click_whatsapp"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                WhatsApp
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={CONTACTS.emailHref}
                placement="footer"
                event="click_email"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                {CONTACTS.email}
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={CONTACTS.instagram}
                placement="footer"
                event="click_instagram"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                Instagram {CONTACTS.instagramHandle}
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={TWOGIS.firmUrl}
                placement="footer"
                event="click_2gis"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                Карточка компании в 2ГИС
              </ExternalLink>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[15px] font-semibold">Документы</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link
                href="/privacy"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                Политика конфиденциальности
              </Link>
            </li>
            <li>
              <Link
                href="/kontakty"
                className="text-[color:var(--ink-2)] hover:text-[color:var(--accent)]"
              >
                Контакты
              </Link>
            </li>
          </ul>

          <p className="mt-4 text-[15px]">
            {/* Флаг читается здесь, на сервере, и передаётся пропсом:
                в клиентском компоненте process.env недоступен. */}
            <LanguageSwitcher kkEnabled={KK_ENABLED} />
          </p>

          <p className="mt-6 text-[13px] text-[color:var(--muted)]">{TWOGIS.asOfLabel}</p>
        </div>
      </div>

      <div className="container-page mt-10 border-t border-[color:var(--line)] pt-6">
        <p className="text-[13px] text-[color:var(--muted)]">
          © {year} {COMPANY_NAME}. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
