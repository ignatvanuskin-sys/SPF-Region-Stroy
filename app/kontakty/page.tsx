import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { FaqList } from '@/components/Faq';
import { LazyLeadForm } from '@/components/LazyBlocks';
import { Section } from '@/components/Section';
import { ContactsSection } from '@/components/sections/ContactsSection';
import { FAQ } from '@/content/faq';
import { seoFor } from '@/content/seo';

const seo = seoFor('/kontakty');

export const metadata: Metadata = {
  title: seo?.title,
  description: seo?.description,
  alternates: { canonical: '/kontakty' },
};

/** Контактные вопросы из раздела 15 — им место именно здесь. */
const CONTACT_FAQ = FAQ.filter((f) =>
  ['districts', 'payment', 'organizations', 'measure', 'warranty'].includes(f.id),
);

export default function ContactsPage() {
  return (
    <>
      <BreadcrumbJsonLd path="/kontakty" name="Контакты" />
      <Breadcrumbs items={[{ label: 'Контакты' }]} />

      <section className="container-page py-8 md:py-12">
        <h1>Контакты</h1>
        <p className="mt-4 max-w-[62ch] text-[17px] text-muted-foreground">
          Проспект Республики, 56/2а, Астана. Позвоните, напишите в WhatsApp или оставьте заявку —
          менеджер свяжется с вами.
        </p>
      </section>

      <Section title="Как с нами связаться">
        <ContactsSection />
      </Section>

      <Section id="form" alt title="Заявка на расчёт или замер">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
          <div id="zayavka">
            <LazyLeadForm />
          </div>
          <div className="card p-5">
            <h3>Другие способы</h3>
            <p className="mt-3 text-[15px] text-muted-foreground">
              Заявки можно не заполнять: напишите в WhatsApp или позвоните менеджеру.
            </p>
            <p className="mt-4 text-[14px] text-muted-foreground">
              Условия выезда, стоимость замера и порядок оплаты уточняются у менеджера.
            </p>
            <div className="mt-4">
              <Link href="/privacy" className="text-[15px] underline">
                Политика конфиденциальности
              </Link>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Вопросы о работе и оплате">
        <FaqList items={CONTACT_FAQ} idPrefix="faq-kontakty" />
      </Section>
    </>
  );
}
