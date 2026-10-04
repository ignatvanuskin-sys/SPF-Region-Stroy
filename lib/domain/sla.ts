/**
 * Контроль SLA первого ответа (master prompt §8.4).
 *
 * Вынесено из cron-маршрута в отдельную функцию, потому что вызывается из двух
 * мест: из «частого» эндпоинта `/api/cron/tick` и напрямую при прогоне очереди.
 * Дублировать эту логику в маршрутах было бы ошибкой — правила эскалации должны
 * меняться в одном месте.
 */

import { getStore } from '@/lib/db';
import { getSiteConfig } from '@/lib/domain/settings';
import { isWithinWorkingHours } from '@/lib/domain/settings';
import { slaEscalationText } from '@/lib/notify/templates';
import { telegramNotifier } from '@/lib/notify/channels';
import { leadKeyboard } from '@/lib/domain/notifications';
import type { SiteConfig } from '@/lib/domain/settings';

export interface SlaResult {
  checked: number;
  escalated: number;
  quiet: boolean;
  inWorkingHours: boolean;
  details: string[];
}

/** Текст с рабочими часами — вставляется в сообщение владельцу. */
export function slaWorkhoursText(hours: SiteConfig['workingHours']): string {
  const WEEKDAY_NAMES = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const days = hours.workdays.map((day) => WEEKDAY_NAMES[day]?.slice(0, 2)).join(', ');
  const format = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return `Рабочие часы: ${days}, ${format(hours.startMinutes)}–${format(hours.endMinutes)}.`;
}

/**
 * Находит заявки, которые не взяли в работу дольше SLA, и эскалирует их.
 *
 * Ключевое правило: по одной заявке эскалация уходит ровно один раз — факт
 * отправки фиксируется событием `sla_breach`. Иначе cron засыпал бы чат
 * сообщениями каждые несколько минут.
 *
 * Вне рабочего времени уведомление отправляется «тихо» (без звука), а разбор
 * переносится в утренний дайджест.
 */
export async function runSlaCheck(now = new Date()): Promise<SlaResult> {
  const store = getStore();
  const config = await getSiteConfig();
  const thresholdMs = config.sla.firstResponseMinutes * 60_000;
  const inWorkingHours = isWithinWorkingHours(now, config.workingHours);
  const quiet = !inWorkingHours;

  const newLeads = await store.listLeads({ status: ['new'], limit: 100 });
  const details: string[] = [];
  let escalated = 0;

  const chat = process.env.TELEGRAM_LEADS_CHAT_ID || process.env.TELEGRAM_OWNER_ID || '';
  const telegramReady = Boolean(process.env.TELEGRAM_BOT_TOKEN && chat);

  for (const lead of newLeads) {
    const waitingMs = now.getTime() - new Date(lead.created_at).getTime();
    if (waitingMs < thresholdMs) continue;

    const events = await store.listLeadEvents(lead.id);
    if (events.some((event) => event.type === 'sla_breach')) continue;

    const minutesWaiting = Math.round(waitingMs / 60_000);

    if (telegramReady) {
      await store.enqueueNotification({
        channel: 'telegram',
        target: chat,
        payload: {
          kind: 'telegram',
          text: slaEscalationText(lead, minutesWaiting),
          disableNotification: quiet,
          keyboard: leadKeyboard(lead),
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

    // Владельцу — только в рабочее время, чтобы не будить ночью.
    const ownerId = process.env.TELEGRAM_OWNER_ID;
    if (ownerId && !quiet && telegramNotifier.isConfigured()) {
      await telegramNotifier
        .send(ownerId, {
          kind: 'telegram',
          text: `⚠️ Заявка #${lead.id} не взята в работу ${minutesWaiting} мин.\n${slaWorkhoursText(config.workingHours)}`,
        })
        .catch(() => undefined);
    }

    await store.addLeadEvent({
      lead_id: lead.id,
      type: 'sla_breach',
      actor_id: null,
      actor_label: 'Система',
      payload: { minutesWaiting, quiet },
      created_at: now.toISOString(),
    });

    escalated += 1;
    details.push(`#${lead.id} — ${minutesWaiting} мин`);
  }

  return { checked: newLeads.length, escalated, quiet, inWorkingHours, details };
}

export { leadKeyboard };
