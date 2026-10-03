import type { Metadata } from 'next';
import { NOTES } from '@/content/notes';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MarkerText } from '@/components/MarkerText';
import { Section } from '@/components/Section';
import { CONTACTS } from '@/content/contacts';
import { COMMENT_BIN } from '@/content/facts';
import { seoFor } from '@/content/seo';

const seo = seoFor('/privacy');

export const metadata: Metadata = {
  title: seo?.title,
  description: seo?.description,
  alternates: { canonical: '/privacy' },
};

/**
 * КАРКАС. Документ должен проверить юрист (разделы 22 и 24 мастер-промпта).
 * Агент сознательно не выдумывает сроки хранения, места обработки данных
 * и юридические формулировки, которых нет в данных компании.
 */
export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Политика конфиденциальности' }]} />

      <section className="container-page py-8 md:py-12">
        <h1>Политика конфиденциальности</h1>
        <div
          role="note"
          className="mt-6 max-w-[76ch] rounded-[10px] border border-border bg-marker p-4 text-[15px] text-marker-foreground"
        >
          Каркас документа. Текст подготовлен без юридической экспертизы и требует проверки
          юристом до запуска сайта.
        </div>
      </section>

      <Section title="1. Оператор">
        <div className="max-w-[76ch] space-y-3 text-[16px] text-muted-foreground">
          <p>
            Оператор персональных данных: {CONTACTS.legalName}, <MarkerText text={COMMENT_BIN} />.
          </p>
          <p>
            Адрес: {CONTACTS.addressFull}. Email для обращений: {CONTACTS.email}. Телефон:{' '}
            <span className="tnum">{CONTACTS.phone}</span>.
          </p>
        </div>
      </Section>

      <Section alt title="2. Какие данные собираются">
        <ul className="max-w-[76ch] space-y-2 text-[16px] text-muted-foreground">
          <li>Имя — если вы его указали.</li>
          <li>Телефон — обязательное поле формы.</li>
          <li>Адрес объекта — если вы его указали.</li>
          <li>Фотографии проёмов и конструкций — если вы их приложили.</li>
          <li>Комментарий к заявке.</li>
          <li>Технические данные о визите и UTM-метки источника перехода.</li>
          <li>
            Cookies аналитики — только если вы нажали «Принять» в уведомлении о cookies. При
            отказе аналитика не загружается.
          </li>
        </ul>
      </Section>

      <Section title="3. Зачем обрабатываются данные">
        <div className="max-w-[76ch] space-y-3 text-[16px] text-muted-foreground">
          <p>Цели: связаться с вами, подготовить расчёт и организовать замер.</p>
          <p>
            Срок хранения: <MarkerText text="[УТОЧНИТЬ У КОМПАНИИ: срок хранения персональных данных]" />
          </p>
        </div>
      </Section>

      <Section alt title="4. Кому передаются данные">
        <div className="max-w-[76ch] space-y-3 text-[16px] text-muted-foreground">
          <p>
            Заявка передаётся сервисам доставки сообщений (мессенджер и/или электронная почта) и не
            сохраняется на сервере сайта: базы данных у сайта нет.
          </p>
          <p>
            <MarkerText text="[УТОЧНИТЬ У КОМПАНИИ: места хранения и обработки данных]" />
          </p>
        </div>
      </Section>

      <Section title="5. Ваши права">
        <div className="max-w-[76ch] space-y-3 text-[16px] text-muted-foreground">
          <p>
            Вы можете обратиться к оператору, чтобы уточнить, изменить или удалить свои данные, а
            также отозвать согласие. Обращения принимаются по адресу {CONTACTS.email} или по
            телефону <span className="tnum">{CONTACTS.phone}</span>.
          </p>
          <p>
            <MarkerText text="[УТОЧНИТЬ У КОМПАНИИ: порядок и сроки рассмотрения обращений]" />
          </p>
        </div>
      </Section>

      <Section alt title="6. Согласие в форме">
        <p className="max-w-[76ch] text-[16px] text-muted-foreground">
          Отправляя форму, вы подтверждаете согласие на обработку персональных данных. Чекбокс
          согласия не отмечен заранее и обязателен для отправки.
        </p>
      </Section>
    </>
  );
}
