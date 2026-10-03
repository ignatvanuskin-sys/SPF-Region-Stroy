import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Clock, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkerText } from '@/components/MarkerText';
import { NOTES } from '@/content/notes';
import { CONTACTS } from '@/content/contacts';
import { getStore } from '@/lib/pipeline/store';
import { CATEGORY_LABEL, PROCESS, STAGE_LABEL, STAGES } from '@/lib/pipeline/types';
import { formatSlot, nextActionFor } from '@/lib/pipeline';
import { waLink, telLink } from '@/lib/whatsapp';

/** Страница статуса заявки. Динамическая: читает хранилище на каждый запрос. */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Статус заявки · СПФ Регион Строй',
  robots: { index: false, follow: false },
};

/**
 * Доступ только по секретному токену из ссылки, которую получил клиент.
 * Телефон и почта на странице не показываются: адрес открывается без входа.
 */
export default async function LeadStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;

  const lead = await getStore().get(id);
  if (!lead) notFound();

  // Токен обязателен: без него заявку по угаданному id не открыть.
  if (!t || t !== lead.token) notFound();

  const stageIndex = STAGES.indexOf(lead.stage);
  const next = nextActionFor(lead);

  return (
    <section className="shell py-12 md:py-16">
      <div className="mx-auto max-w-2xl">
        <Badge variant="secondary">Заявка {lead.reference}</Badge>
        <h1 className="mt-4 text-[clamp(28px,5vw,40px)]">Статус заявки</h1>
        <p className="mt-3 text-[17px] text-muted-foreground">
          {CATEGORY_LABEL[lead.category]}. Обновляется автоматически — обновляйте страницу, чтобы
          увидеть изменения.
        </p>

        {/* Прогресс воронки */}
        <ol className="mt-8 space-y-1">
          {STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const current = i === stageIndex;
            return (
              <li key={stage} className="flex items-start gap-3">
                <span
                  className={
                    done || current
                      ? 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                      : 'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[12px] text-muted-foreground'
                  }
                  aria-hidden="true"
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className="block">
                  <span
                    className={
                      current
                        ? 'block text-[16px] font-semibold'
                        : done
                          ? 'block text-[16px] text-muted-foreground'
                          : 'block text-[16px] text-muted-foreground/60'
                    }
                  >
                    {STAGE_LABEL[stage]}
                  </span>
                  {current && (
                    <span className="mt-0.5 block text-[14px] text-muted-foreground">
                      Текущий этап
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Детали */}
        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <dl className="space-y-3 text-[15px]">
            <Row label="Что нужно" value={CATEGORY_LABEL[lead.category]} />
            {lead.objectType && <Row label="Тип объекта" value={lead.objectType} />}
            {lead.sizes && <Row label="Размеры" value={lead.sizes} />}
            {lead.measurementSlot && (
              <Row label="Замер" value={formatSlot(lead.measurementSlot)} />
            )}
            <Row label="Фото" value={`${lead.photos.length}`} />
            <Row label="Создана" value={formatSlot(lead.createdAt)} />
          </dl>

          {lead.address && (
            <p className="mt-4 flex items-start gap-2 text-[15px] text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {lead.address}
            </p>
          )}

          {lead.crm?.ok && (
            <p className="mt-4 text-[14px] text-success">
              Заявка передана в CRM (получатель: {lead.crm.provider}).
            </p>
          )}

          {next && (
            <p className="mt-4 flex items-start gap-2 text-[14px] text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Следующее действие менеджера:{' '}
                {new Intl.DateTimeFormat('ru-RU', {
                  timeZone: PROCESS.timezone,
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(next.at))}
              </span>
            </p>
          )}
        </div>

        <p className="mt-6 text-[15px] text-muted-foreground">
          Менеджер свяжется с вами. <MarkerText text={NOTES.responseTime} />
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="wa" size="lg">
            <a href={waLink({ context: 'general' })} target="_blank" rel="noopener noreferrer">
              Написать в WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={telLink()} className="tnum">
              {CONTACTS.phone}
            </a>
          </Button>
        </div>

        <p className="mt-8 text-[14px] text-muted-foreground">
          Ссылка персональная — не пересылайте её. Если нужно изменить данные, напишите менеджеру.{' '}
          <Link href="/" className="underline underline-offset-2">
            На главную
          </Link>
        </p>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
