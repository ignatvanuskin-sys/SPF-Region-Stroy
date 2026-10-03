/**
 * lib/pipeline/reminders.ts — планировщик напоминаний менеджеру.
 *
 * Правила:
 *   sla_breach        — заявка есть, менеджер не связался за SLA (10 минут);
 *   measurement_soon  — за 24 часа до слота замера;
 *   measurement_today — за 2 часа до слота;
 *   quote_followup    — замер выполнен, расчёт не отправлен N дней;
 *   review_request    — монтаж выполнен N дней назад → запрос отзыва в 2ГИС.
 *
 * Каждое напоминание отправляется один раз: список отправленных хранится
 * в самой заявке (sentReminders), поэтому повторный запуск планировщика
 * не создаёт дублей.
 */

import { addDays, addHours, formatSlot } from './schedule';
import { CATEGORY_LABEL, PROCESS, STAGE_LABEL, type Lead, type Reminder, type ReminderKind } from './types';
import { TWOGIS } from '@/content/twogis';

export const REMINDER_TITLE: Record<ReminderKind, string> = {
  sla_breach: 'Просрочен контакт с клиентом',
  measurement_soon: 'Завтра замер',
  measurement_today: 'Замер сегодня',
  quote_followup: 'Расчёт не отправлен',
  review_request: 'Пора запросить отзыв в 2ГИС',
};

function who(lead: Lead): string {
  return `${lead.name || 'Без имени'} · ${lead.phone}`;
}

/** Текст запроса отзыва — уже готов к отправке клиенту. */
export function reviewRequestText(lead: Lead): string {
  return [
    `${lead.name ? `${lead.name}, здравствуйте!` : 'Здравствуйте!'}`,
    '',
    'Спасибо, что выбрали нас. Если работа понравилась, будьте добры оставить отзыв в 2ГИС — для нас это очень важно.',
    TWOGIS.reviewsUrl,
    '',
    'Если что-то нужно поправить — напишите, решим.',
  ].join('\n');
}

/** Считает напоминания, которые пора отправить. */
export function dueReminders(leads: Lead[], now: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];
  const nowMs = now.getTime();

  const push = (lead: Lead, kind: ReminderKind, dueAt: string, urgent: boolean, body: string) => {
    if (lead.sentReminders.includes(kind)) return;
    if (new Date(dueAt).getTime() > nowMs) return;
    out.push({
      kind,
      leadId: lead.id,
      dueAt,
      urgent,
      title: REMINDER_TITLE[kind],
      body,
    });
  };

  for (const lead of leads) {
    // 1. SLA: менеджер должен связаться вовремя.
    if (['new', 'confirmed', 'crm_synced'].includes(lead.stage)) {
      const deadline = addHours(lead.createdAt, 0);
      const due = new Date(
        new Date(deadline).getTime() + PROCESS.contactSlaMinutes * 60 * 1000,
      ).toISOString();
      push(
        lead,
        'sla_breach',
        due,
        true,
        [
          `Прошло больше ${PROCESS.contactSlaMinutes} минут, статус: ${STAGE_LABEL[lead.stage]}.`,
          `Клиент: ${who(lead)}`,
          `Заявка: ${CATEGORY_LABEL[lead.category]} · ${lead.reference}`,
          lead.address ? `Адрес: ${lead.address}` : '',
          'Свяжитесь с клиентом и отметьте этап.',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    // 2 и 3. Напоминания о замере.
    if (lead.measurementSlot && lead.stage === 'measurement_scheduled') {
      const slot = lead.measurementSlot;
      const before24 = addHours(slot, -24);
      const before2 = addHours(slot, -2);

      push(
        lead,
        'measurement_soon',
        before24,
        false,
        [
          `Замер ${formatSlot(slot)} (Астана).`,
          `Клиент: ${who(lead)}`,
          lead.address ? `Адрес: ${lead.address}` : 'Адрес не указан',
          `Заявка: ${CATEGORY_LABEL[lead.category]} · ${lead.reference}`,
        ].join('\n'),
      );

      push(
        lead,
        'measurement_today',
        before2,
        true,
        [
          `Замер через 2 часа: ${formatSlot(slot)}.`,
          `Клиент: ${who(lead)}`,
          lead.address ? `Адрес: ${lead.address}` : 'Адрес не указан',
        ].join('\n'),
      );
    }

    // 4. Замер выполнен, расчёт не отправлен.
    if (lead.stage === 'measured') {
      const due = addDays(lead.updatedAt, PROCESS.quoteFollowupDays);
      push(
        lead,
        'quote_followup',
        due,
        false,
        [
          `Замер выполнен, расчёт ещё не отправлен (${PROCESS.quoteFollowupDays} дн.).`,
          `Клиент: ${who(lead)}`,
          `Заявка: ${CATEGORY_LABEL[lead.category]} · ${lead.reference}`,
          'Подготовьте и отправьте предложение.',
        ].join('\n'),
      );
    }

    // 5. Монтаж выполнен → запрос отзыва.
    if (lead.stage === 'installed') {
      const due = addDays(lead.updatedAt, PROCESS.reviewRequestDays);
      push(
        lead,
        'review_request',
        due,
        false,
        [
          `Монтаж завершён ${PROCESS.reviewRequestDays} дн. назад.`,
          `Клиент: ${who(lead)}`,
          'Готовый текст запроса отзыва (отправьте в WhatsApp):',
          '',
          reviewRequestText(lead),
        ].join('\n'),
      );
    }
  }

  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

/** Следующее действие для карточки заявки. */
export function nextActionFor(lead: Lead): { kind: ReminderKind; at: string } | null {
  const candidates: { kind: ReminderKind; at: string }[] = [];

  if (!lead.sentReminders.includes('sla_breach') && ['new', 'confirmed', 'crm_synced'].includes(lead.stage)) {
    candidates.push({
      kind: 'sla_breach',
      at: new Date(
        new Date(lead.createdAt).getTime() + PROCESS.contactSlaMinutes * 60 * 1000,
      ).toISOString(),
    });
  }

  if (lead.measurementSlot && lead.stage === 'measurement_scheduled') {
    candidates.push({ kind: 'measurement_soon', at: addHours(lead.measurementSlot, -24) });
    candidates.push({ kind: 'measurement_today', at: addHours(lead.measurementSlot, -2) });
  }

  if (lead.stage === 'measured') {
    candidates.push({ kind: 'quote_followup', at: addDays(lead.updatedAt, PROCESS.quoteFollowupDays) });
  }

  if (lead.stage === 'installed') {
    candidates.push({ kind: 'review_request', at: addDays(lead.updatedAt, PROCESS.reviewRequestDays) });
  }

  const pending = candidates
    .filter((c) => !lead.sentReminders.includes(c.kind))
    .sort((a, b) => a.at.localeCompare(b.at));

  return pending[0] ?? null;
}
