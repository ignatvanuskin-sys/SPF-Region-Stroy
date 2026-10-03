import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/Breadcrumbs';

/**
 * Тестовая страница проверки казахских глифов (раздел 16.3).
 * Обязательный шаг: убедиться, что выбранный шрифт рисует «Әә Ғғ Ққ Ңң Өө Ұұ Үү Һһ Іі»
 * собственными глифами, без подмены. Если хотя бы один символ выглядит иначе —
 * шрифт меняется.
 */
export const metadata: Metadata = {
  title: 'Проверка шрифта · служебная страница',
  robots: { index: false, follow: false },
};

const KAZAKH = 'Әә Ғғ Ққ Ңң Өө Ұұ Үү Һһ Іі';
const RU = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
const DIGITS = '0123456789 +7 701 893 67 87';

export default function FontTestPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Проверка шрифта' }]} />
      <section className="container-page py-10">
        <h1>Проверка казахских глифов</h1>
        <p className="mt-4 max-w-[70ch] text-[16px] text-muted-foreground">
          Служебная страница. Проверьте, что все символы ниже нарисованы одним шрифтом, без
          подстановки системных глифов.
        </p>

        <dl className="mt-8 space-y-8">
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Казахские буквы · 400
            </dt>
            <dd className="mt-2 text-[40px] leading-tight" style={{ fontWeight: 400 }}>
              {KAZAKH}
            </dd>
          </div>
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Казахские буквы · 600
            </dt>
            <dd className="mt-2 text-[40px] leading-tight" style={{ fontWeight: 600 }}>
              {KAZAKH}
            </dd>
          </div>
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Казахские буквы · 700
            </dt>
            <dd className="mt-2 text-[40px] leading-tight" style={{ fontWeight: 700 }}>
              {KAZAKH}
            </dd>
          </div>
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Кириллица
            </dt>
            <dd className="mt-2 text-[22px] leading-relaxed">{RU}</dd>
          </div>
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Цифры и телефон
            </dt>
            <dd className="tnum mt-2 text-[28px]">{DIGITS}</dd>
          </div>
          <div>
            <dt className="text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Проверочная строка на казахском
            </dt>
            <dd className="mt-2 text-[20px]">
              Терезе, есік және қасбет витраждары — Астана қаласы.
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
