import { CONTACTS } from '@/content/contacts';
import { TWOGIS } from '@/content/twogis';
import { MarkerText } from '@/components/MarkerText';
import { CallButton, ExternalLink, WaButton } from '@/components/Cta';
import { MapLazy } from '@/components/sections/MapLazy';

/** 9.11 / 12. Контакты. Второй номер WhatsApp (F06) и график (F15) не публикуются. */
export function ContactsSection() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <dl className="space-y-4 text-[16px]">
          <div>
            <dt className="text-[14px] text-muted-foreground">Адрес</dt>
            <dd className="mt-1">
              {CONTACTS.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">Телефон</dt>
            <dd className="mt-1">
              <a href={CONTACTS.phoneHref} className="tnum font-semibold hover:text-primary">
                {CONTACTS.phone}
              </a>
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">WhatsApp</dt>
            <dd className="mt-1">
              <ExternalLink
                href={CONTACTS.whatsapp}
                placement="contacts"
                event="click_whatsapp"
                className="hover:text-primary"
              >
                Написать в WhatsApp
              </ExternalLink>
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">Email</dt>
            <dd className="mt-1">
              <ExternalLink
                href={CONTACTS.emailHref}
                placement="contacts"
                event="click_email"
                className="hover:text-primary"
              >
                {CONTACTS.email}
              </ExternalLink>
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">Instagram</dt>
            <dd className="mt-1">
              <ExternalLink
                href={CONTACTS.instagram}
                placement="contacts"
                event="click_instagram"
                className="hover:text-primary"
              >
                {CONTACTS.instagramHandle}
              </ExternalLink>
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">2ГИС</dt>
            <dd className="mt-1">
              <ExternalLink
                href={TWOGIS.firmUrl}
                placement="contacts"
                event="click_2gis"
                className="hover:text-primary"
              >
                Карточка компании в 2ГИС
              </ExternalLink>
            </dd>
          </div>

          <div>
            <dt className="text-[14px] text-muted-foreground">График работы</dt>
            <dd className="mt-1">
              {CONTACTS.scheduleFallback}
              <span className="mt-2 block text-[14px] text-muted-foreground">
                <MarkerText text={CONTACTS.schedule} />
              </span>
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <WaButton context="general" placement="contacts" />
          <CallButton placement="contacts" />
        </div>
      </div>

      <div>
        <MapLazy />
      </div>
    </div>
  );
}
