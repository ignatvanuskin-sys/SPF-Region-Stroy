import type { Metadata } from 'next';
import { Alert } from '@/components/ui/feedback';
import { Breadcrumbs, PageHero } from '@/components/site/sections';
import { Section } from '@/components/ui/card';
import { getSiteConfig } from '@/lib/domain/settings';
import { toContacts } from '@/lib/site-view';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности и обработка персональных данных',
  description:
    'Как мы обрабатываем персональные данные: какие данные собираем, зачем, сколько храним, как их удалить и куда обращаться.',
  alternates: { canonical: '/politika' },
  robots: { index: true, follow: true },
};

/**
 * Политика конфиденциальности (§15).
 *
 * ВАЖНО ДЛЯ ВЛАДЕЛЬЦА: это рабочий шаблон, а не юридический документ.
 * Текст нужно проверить у юриста и уточнить требования законодательства
 * Республики Казахстан к хранению персональных данных (в том числе вопрос о
 * размещении базы на серверах в Казахстане). См. docs/RISKS.md.
 */
export default async function Page() {
  const config = await getSiteConfig();
  const contacts = toContacts(config);
  const updated = '4 октября 2026 года';

  return (
    <>
      <PageHero
        eyebrow="Документы"
        title="Политика конфиденциальности"
        lead="Как мы обращаемся с вашими персональными данными"
        description={`Действует с ${updated}.`}
      >
        <Breadcrumbs items={[{ name: 'Политика конфиденциальности', href: '/politika' }]} />
      </PageHero>

      <Section>
        <div className="container-page">
          <div className="mx-auto max-w-3xl space-y-8 text-[0.9375rem] leading-relaxed text-[var(--color-ink-soft)]">
            <Alert tone="warning">
              Это шаблон. Перед публикацией текст должен проверить юрист — особенно разделы о сроке
              хранения данных и о размещении серверов.
            </Alert>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">1. Кто обрабатывает данные</h2>
              <p className="mt-3">
                Оператор персональных данных — {config.legalName} (далее «мы»). Связаться можно по
                телефону {contacts.phonePrimary} или по e-mail {contacts.email}.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">2. Какие данные мы собираем</h2>
              <p className="mt-3">
                Только те, которые нужны, чтобы связаться с вами и подготовить расчёт:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>имя или то, как вы предпочитаете к себе обращаться;</li>
                <li>номер телефона;</li>
                <li>адрес электронной почты — если вы его указали;</li>
                <li>адрес объекта и район — при записи на замер;</li>
                <li>параметры конструкции из калькулятора и комментарий к заявке;</li>
                <li>файлы, которые вы приложили (чертежи, эскизы, фото).</li>
              </ul>
              <p className="mt-3">
                Мы не собираем данные о здоровье, вероисповедании, политических взглядах и иные
                специальные категории данных. Не запрашиваем данные банковских карт.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">3. Зачем мы их обрабатываем</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>связаться с вами по заявке и подготовить расчёт стоимости;</li>
                <li>согласовать и провести замер, оформить и выполнить заказ;</li>
                <li>отправить документы, если работа ведётся по договору;</li>
                <li>пригласить вас оставить отзыв — только после выполнения работ.</li>
              </ul>
              <p className="mt-3">
                Мы не передаём ваши данные третьим лицам для рекламы и не продаём их.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">4. Согласие</h2>
              <p className="mt-3">
                В каждой форме сайта есть отдельный, изначально не отмеченный чекбокс согласия. Мы
                фиксируем факт согласия, дату и версию текста согласия вместе с заявкой. Отозвать
                согласие можно в любой момент — напишите нам, и мы удалим ваши данные.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">5. Сроки хранения</h2>
              <p className="mt-3">
                Данные по заявкам, которые не превратились в заказ, храним не дольше 12 месяцев.
                Данные по выполненным заказам храним в течение гарантийного срока и срока,
                установленного законодательством. Точный срок нужно согласовать с юристом.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">6. Кто видит данные</h2>
              <p className="mt-3">
                Сотрудники, которые работают с заявками. Уведомления о новых заявках приходят в
                служебный Telegram-чат компании — доступ к нему есть только у сотрудников. При
                увольнении сотрудника доступ отзывается.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">7. Cookie и аналитика</h2>
              <p className="mt-3">
                Обязательные технические cookie нужны для работы форм и защиты от спама. Аналитические
                счётчики (Яндекс.Метрика, Google Analytics, Meta Pixel) подключаются только после
                того, как вы нажали «Разрешить аналитику» в баннере согласия. Если вы отказались, они
                не загружаются вовсе.
              </p>
              <p className="mt-3">
                Мы фиксируем обезличенные события на сайте: какая страница открыта, какая кнопка
                нажата, с какого источника пришёл посетитель. Телефоны и имена в аналитику не
                попадают.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">8. Ваши права</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>узнать, какие ваши данные у нас есть;</li>
                <li>исправить их, если они неверные;</li>
                <li>отозвать согласие и потребовать удаления данных;</li>
                <li>получить ответ на обращение.</li>
              </ul>
              <p className="mt-3">
                Напишите на {contacts.email} или позвоните по номеру {contacts.phonePrimary} — мы
                удалим данные и подтвердим это.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">9. Безопасность</h2>
              <p className="mt-3">
                Сайт работает по HTTPS. Доступ к панели управления — по логину и паролю, пароли
                хранятся только в зашифрованном виде. В журналах системы телефон записывается
                замаскированным (например, +7701***6787), чтобы данные не утекали через логи.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[var(--color-ink)]">10. Изменения</h2>
              <p className="mt-3">
                Если политика меняется, мы обновляем дату в начале страницы. Актуальная версия всегда
                доступна по адресу /politika.
              </p>
            </section>
          </div>
        </div>
      </Section>
    </>
  );
}
