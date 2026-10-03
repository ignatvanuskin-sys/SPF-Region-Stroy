import type { Metadata } from 'next';
import Link from 'next/link';

import { NOTES } from '@/content/notes';
import { MarkerText } from '@/components/MarkerText';
import { CallButton, WaButton } from '@/components/Cta';

/**
 * Страница успешной отправки.
 * Показывается только после ответа сервера 200 (см. LeadForm).
 * Индексировать её не нужно.
 */
export const metadata: Metadata = {
  title: 'Заявка отправлена · СПФ Регион Строй',
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <section className="container-page py-16 md:py-24">
      <h1>Заявка отправлена</h1>
      <p className="mt-4 max-w-[62ch] text-[17px] text-muted-foreground">
        Менеджер свяжется с вами. <MarkerText text={NOTES.responseTime} /> Если вопрос срочный,
        напишите в WhatsApp или позвоните — так быстрее.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <WaButton context="general" placement="thanks" />
        <CallButton placement="thanks" />
      </div>

      <p className="mt-8 text-[15px] text-muted-foreground">
        <Link href="/" className="underline">
          Вернуться на главную
        </Link>
      </p>
    </section>
  );
}
