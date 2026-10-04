/**
 * Регулярные сообщения команде (§10):
 *  • утренний дайджест 09:00 Asia/Almaty;
 *  • напоминания замерщикам накануне вечером и за 2 часа до выезда;
 *  • напоминание «попросите отзыв» через N дней после монтажа.
 *
 * Каждое напоминание отправляется строго один раз: факт отправки пишется
 * событием в `lead_events`, поэтому повторный прогон cron ничего не дублирует.
 */

import { getStore } from '@/lib/db';
import { getSiteConfig } from '@/lib/domain/settings';
import { telegramNotifier } from '@/lib/notify/channels';
import { digestText, measurementReminderText, reviewReminderText } from '@/lib/notify/templates';
import { formatSlotLabel, localDateKey } from '@/lib/domain/measurements';
import { formatDateLong } from '@/lib/utils';

/**
 * Текст с рабочими часами переехал в lib/domain/sla.ts — там же, где считается
 * сам SLA. Держать две копии этой строки было бы источником расхождений.
 */

function targetChat(): string {
  return process.env.TELEGRAM_LEADS_CHAT_ID || process.env.TELEGRAM_OWNER_ID || '';
}

/**
 * Утренний дайджест: необработанные заявки и замеры на сегодня.
 * Отправляется тихо, если чат настроен на уведомления ночью.
 */
export async function runMorningDigest(): Promise<{ sent: boolean; unprocessed: number; measurements: number }> {
  const store = getStore();
  const chat = targetChat();
  const now = new Date();
  const tz = 'Asia/Almaty';

  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const from = new Date(dayStart.getTime() - 5 * 3600_000).toISOString();
  const to = new Date(from).getTime() + 24 * 3600_000;

  const unprocessed = await store.listLeads({ status: ['new'], limit: 50 });
  const measurements = (await store.listMeasurements({ from, to: new Date(to).toISOString() })).filter(
    (measurement) => localDateKey(new Date(measurement.starts_at), tz) === localDateKey(now, tz),
  );

  const enriched = await Promise.all(
    measurements.map(async (measurement) => {
      const lead = await store.getLead(measurement.lead_id);
      return { ...measurement, leadName: lead?.name, leadPhone: lead?.phone };
    }),
  );

  const text = digestText({
    dateLabel: formatDateLong(now),
    newLeads: unprocessed,
    measurements: enriched,
  });

  if (!chat || !process.env.TELEGRAM_BOT_TOKEN) {
    return { sent: false, unprocessed: unprocessed.length, measurements: measurements.length };
  }

  await store.enqueueNotification({
    channel: 'telegram',
    target: chat,
    payload: { kind: 'telegram', text } as unknown as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    next_attempt_at: now.toISOString(),
    last_error: null,
    created_at: now.toISOString(),
    sent_at: null,
  });

  return { sent: true, unprocessed: unprocessed.length, measurements: measurements.length };
}

/**
 * Напоминания о замерах. `when`:
 *  • `tomorrow` — вечернее напоминание замерщикам накануне (запускать в ~18:00);
 *  • `soon` — за 2 часа до выезда (запускать каждые 15 минут).
 */
export async function runMeasureReminders(
  when: 'tomorrow' | 'soon',
): Promise<{ sent: number }> {
  const store = getStore();
  const now = new Date();
  const windowStart =
    when === 'tomorrow'
      ? new Date(now.getTime() + 12 * 3600_000) // «завтра» начинается примерно через 12 часов
      : new Date(now.getTime() + 90 * 60_000); // окно ±30 минут вокруг «через 2 часа»
  const windowEnd =
    when === 'tomorrow'
      ? new Date(now.getTime() + 36 * 3600_000)
      : new Date(now.getTime() + 150 * 60_000);

  const measurements = await store.listMeasurements({
    from: windowStart.toISOString(),
    to: windowEnd.toISOString(),
  });

  let sent = 0;
  for (const measurement of measurements) {
    if (measurement.status === 'canceled' || measurement.status === 'done') continue;

    const events = await store.listLeadEvents(measurement.lead_id);
    const reminderType = when === 'tomorrow' ? 'reminder_evening' : 'reminder_soon';
    if (events.some((event) => event.type === reminderType && (event.payload as any)?.measurementId === measurement.id)) {
      continue;
    }

    const lead = await store.getLead(measurement.lead_id);
    if (!lead) continue;

    const text = measurementReminderText(measurement, lead, when);
    const chat = targetChat();

    if (chat && process.env.TELEGRAM_BOT_TOKEN) {
      await store.enqueueNotification({
        channel: 'telegram',
        target: chat,
        payload: {
          kind: 'telegram',
          text,
          keyboard: leadKeyboardForLead(lead),
          meta: { leadId: lead.id },
        } as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        next_attempt_at: now.toISOString(),
        last_error: null,
        created_at: now.toISOString(),
        sent_at: null,
      });
    }

    // Отдельно — назначенному замерщику, если он есть и привязан к Telegram.
    if (measurement.assignee_id) {
      const staff = (await store.listStaff(true)).find((item) => item.id === measurement.assignee_id);
      if (staff) {
        await telegramNotifier
          .send(String(staff.telegram_id), { kind: 'telegram', text })
          .catch(() => undefined);
      }
    }

    await store.addLeadEvent({
      lead_id: lead.id,
      type: reminderType,
      actor_id: null,
      actor_label: 'Система',
      payload: { measurementId: measurement.id },
      created_at: now.toISOString(),
    });
    sent += 1;
  }

  return { sent };
}

function leadKeyboardForLead(lead: { id: number }) {
  return [
    [
      { text: '✅ Взял в работу', callback_data: `take:${lead.id}` },
      { text: '📅 Назначить замер', callback_data: `measure_menu:${lead.id}` },
    ],
  ];
}

/**
 * Просьба об отзыве (§8.5).
 *
 * Запускается раз в день. Берёт лиды со статусом `installed`, у которых прошло
 * N дней (по умолчанию 2) и по которым отзыв ещё не просили. Отправляет
 * менеджеру кнопку — сообщение клиенту пишет человек, а не бот: так соблюдаются
 * правила WhatsApp о нежелательных рассылках.
 */
export async function runReviewReminders(): Promise<{ sent: number }> {
  const store = getStore();
  const config = await getSiteConfig();
  const now = new Date();
  const delayDays = Number(process.env.REVIEW_REQUEST_DELAY_DAYS || 2);

  const installed = await store.listLeads({ status: ['installed'], limit: 100 });
  const chat = targetChat();
  let sent = 0;

  for (const lead of installed) {
    if (lead.review_requested_at) continue;
    const updated = new Date(lead.updated_at).getTime();
    if (now.getTime() - updated < delayDays * 24 * 3600_000) continue;

    const text = reviewReminderText(lead);

    if (chat && process.env.TELEGRAM_BOT_TOKEN) {
      await store.enqueueNotification({
        channel: 'telegram',
        target: chat,
        payload: {
          kind: 'telegram',
          text,
          keyboard: [
            [{ text: '⭐️ Просьба об отзыве', callback_data: `review:${lead.id}` }],
          ],
          meta: { leadId: lead.id },
        } as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        next_attempt_at: now.toISOString(),
        last_error: null,
        created_at: now.toISOString(),
        sent_at: null,
      });
    }

    await store.updateLead(lead.id, { review_requested_at: now.toISOString() });
    await store.addLeadEvent({
      lead_id: lead.id,
      type: 'review_requested',
      actor_id: null,
      actor_label: 'Система',
      payload: { gisReviews: config.gisReviews },
      created_at: now.toISOString(),
    });
    sent += 1;
  }

  return { sent };
}

export { formatSlotLabel };
