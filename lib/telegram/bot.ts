/**
 * Telegram-бот команды (master prompt §10).
 *
 * Бот НЕ общается с клиентами: он уведомляет сотрудников и принимает от них
 * команды. Доступ — только для сотрудников из белого списка (`staff`).
 * Новый сотрудник попадает в список по одноразовому коду-приглашению.
 *
 * Все обработчики идемпотентны: повторное нажатие кнопки не ломает состояние,
 * а «взял в работу» выигрывает первый нажавший — остальные видят, кто взял.
 */

import type { Lead } from '@/lib/db/types';
import { getStore } from '@/lib/db';
import { telegramNotifier } from '@/lib/notify/channels';
import { assignLead, changeLeadStatus } from '@/lib/domain/leads';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  canTransition,
  isOpenStatus,
  type LeadStatus,
} from '@/lib/domain/statuses';
import { formatPhone } from '@/lib/phone';
import { leadKeyboard } from '@/lib/domain/notifications';
import { formatSlotLabel } from '@/lib/domain/measurements';
import { getSiteConfig } from '@/lib/domain/settings';
import { generateSlots } from '@/lib/domain/measurements';
import { measureConfirmationText, reviewRequestText, whatsappLink } from '@/lib/notify/templates';

interface TelegramUpdate {
  message?: {
    message_id: number;
    chat: { id: number | string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; username?: string };
    message?: { message_id: number; chat: { id: number | string } };
    data?: string;
  };
}

const HELP_TEXT = [
  'Команды бота СПФ Регион Строй:',
  '',
  '/new — необработанные заявки',
  '/my — мои заявки',
  '/today — замеры на сегодня',
  '/week — замеры на неделю',
  '/stats — сводка за сегодня и неделю',
  '/find +7… — поиск по телефону',
  '/help — эта справка',
].join('\n');

function actorLabel(from?: { first_name?: string; username?: string }): string {
  if (!from) return 'Telegram';
  return from.first_name || from.username || `ID ${'id' in from ? from.id : ''}`;
}

/**
 * Точка входа: обрабатывает один update от Telegram.
 * Возвращает true, если апдейт обработан (нужно для логов).
 */
export async function handleUpdate(update: TelegramUpdate): Promise<boolean> {
  const store = getStore();

  if (update.callback_query) {
    const query = update.callback_query;
    const staff = await store.findStaffByTelegramId(String(query.from.id));
    if (!staff || !staff.active) {
      await telegramNotifier.answerCallbackQuery(query.id, 'Нет доступа. Попросите владельца добавить вас.');
      return false;
    }
    await telegramNotifier.answerCallbackQuery(query.id);
    await handleCallback(query.data ?? '', staff, query.message?.message_id);
    return true;
  }

  const message = update.message;
  if (!message?.text) return false;

  const telegramId = String(message.from?.id ?? message.chat.id);
  const text = message.text.trim();

  // Регистрация по коду-приглашению: /start КОД
  const startMatch = /^\/start\s+([A-Z0-9]{6,16})$/i.exec(text);
  if (startMatch) {
    const staff = await store.findStaffByInviteCode(startMatch[1].toUpperCase());
    if (!staff) {
      await telegramNotifier.send(String(message.chat.id), {
        kind: 'telegram',
        text: 'Код не найден или уже использован. Попросите владельца создать новый.',
      });
      return true;
    }
    await store.updateStaff(staff.id, { telegram_id: telegramId, invite_code: null });
    await telegramNotifier.send(String(message.chat.id), {
      kind: 'telegram',
      text: `Готово, ${staff.name}. Теперь сюда будут приходить заявки.\n\n${HELP_TEXT}`,
    });
    return true;
  }

  const staff = await store.findStaffByTelegramId(telegramId);
  if (!staff || !staff.active) {
    await telegramNotifier.send(String(message.chat.id), {
      kind: 'telegram',
      text: 'Это служебный бот компании. Если вы сотрудник — попросите владельца прислать код-приглашение.',
    });
    return false;
  }

  const chatId = String(message.chat.id);

  if (text === '/help' || text === '/start') {
    await telegramNotifier.send(chatId, { kind: 'telegram', text: HELP_TEXT });
    return true;
  }

  if (text === '/new') {
    const leads = await store.listLeads({ status: ['new'], limit: 15 });
    await telegramNotifier.send(chatId, { kind: 'telegram', text: renderLeadList(leads, 'Необработанные заявки') });
    return true;
  }

  if (text === '/my') {
    const leads = await store.listLeads({ assigneeId: staff.id, limit: 15 });
    await telegramNotifier.send(chatId, { kind: 'telegram', text: renderLeadList(leads, `Мои заявки — ${staff.name}`) });
    return true;
  }

  if (text === '/today' || text === '/week') {
    const days = text === '/today' ? 1 : 7;
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 3600_000);
    const measurements = await store.listMeasurements({ from: from.toISOString(), to: to.toISOString() });
    const lines = [text === '/today' ? 'Замеры на сегодня' : 'Замеры на неделю', ''];
    if (measurements.length === 0) {
      lines.push('Пока ничего не запланировано.');
    } else {
      for (const measurement of measurements) {
        const lead = await store.getLead(measurement.lead_id);
        lines.push(
          `• ${formatSlotLabel(measurement.starts_at, 'Asia/Almaty')} — ${lead?.name ?? 'клиент'}${
            measurement.district ? `, ${measurement.district}` : ''
          }${measurement.status === 'pending' ? ' ⏳ не подтверждён' : ''}`,
        );
      }
    }
    await telegramNotifier.send(chatId, { kind: 'telegram', text: lines.join('\n') });
    return true;
  }

  if (text === '/stats') {
    if (staff.role !== 'owner' && staff.role !== 'manager') {
      await telegramNotifier.send(chatId, { kind: 'telegram', text: 'Сводка доступна владельцу и менеджерам.' });
      return true;
    }
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
    const today = await store.countLeads({ from: dayAgo });
    const week = await store.countLeads({ from: weekAgo });
    const unprocessed = await store.countLeads({ status: ['new'] });
    const all = await store.listLeads({ from: weekAgo, limit: 500 });
    const bySource = new Map<string, number>();
    for (const lead of all) bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);
    const sources = [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => `• ${source}: ${count}`)
      .join('\n');

    await telegramNotifier.send(chatId, {
      kind: 'telegram',
      text: [
        'Сводка',
        '',
        `Заявок за сутки: ${today}`,
        `Заявок за неделю: ${week}`,
        `Не обработано: ${unprocessed}`,
        '',
        sources ? `По источникам за неделю:\n${sources}` : 'Источники появятся, когда будут заявки.',
      ].join('\n'),
    });
    return true;
  }

  const findMatch = /^\/find\s+(.+)$/.exec(text);
  if (findMatch) {
    const leads = await store.listLeads({ search: findMatch[1].trim(), limit: 10 });
    await telegramNotifier.send(chatId, {
      kind: 'telegram',
      text: renderLeadList(leads, `Поиск: ${findMatch[1].trim()}`),
    });
    return true;
  }

  await telegramNotifier.send(chatId, { kind: 'telegram', text: `Не понял команду.\n\n${HELP_TEXT}` });
  return true;
}

function renderLeadList(leads: Lead[], title: string): string {
  if (leads.length === 0) return `${title}\n\nНичего нет.`;
  const lines = [title, ''];
  for (const lead of leads) {
    lines.push(`#${lead.id} ${lead.name} · ${formatPhone(lead.phone)}`);
    lines.push(`   ${LEAD_STATUS_LABELS[lead.status]}${lead.district ? ` · ${lead.district}` : ''}`);
  }
  return lines.join('\n');
}

// --------------------------------------------------------------- callback-и

async function handleCallback(
  data: string,
  staff: { id: number; name: string; role: string },
  messageId?: number,
): Promise<void> {
  const [action, rawId] = data.split(':');
  const leadId = Number(rawId);
  if (!Number.isFinite(leadId) || leadId <= 0) return;

  const store = getStore();
  const lead = await store.getLead(leadId);
  if (!lead) return;

  switch (action) {
    case 'take': {
      // Защита от гонки: «взял в работу» фиксирует первый, кто нажал.
      if (lead.assignee_id && lead.assignee_id !== staff.id) {
        const owner = await store.listStaff();
        const assignee = owner.find((item) => item.id === lead.assignee_id);
        await notifyStaff(staff.id, `Заявку #${lead.id} уже взял ${assignee?.name ?? 'другой сотрудник'}.`);
        return;
      }
      await assignLead(lead.id, staff.id, staff.name);
      if (lead.status === 'new') {
        await changeLeadStatus(lead.id, 'taken', { actorId: staff.id, actorLabel: staff.name });
      }
      await notifyStaff(staff.id, `Вы взяли заявку #${lead.id} — ${lead.name}, ${formatPhone(lead.phone)}`);
      return;
    }

    case 'status_menu': {
      const rows: { text: string; callback_data: string }[][] = [];
      let row: { text: string; callback_data: string }[] = [];
      for (const status of LEAD_STATUSES) {
        if (status === 'lost' || !canTransition(lead.status, status)) continue;
        row.push({ text: LEAD_STATUS_LABELS[status], callback_data: `status_set:${lead.id}:${status}` });
        if (row.length === 2) {
          rows.push(row);
          row = [];
        }
      }
      if (row.length) rows.push(row);
      rows.push([{ text: '❌ Отказ', callback_data: `lost_menu:${lead.id}` }]);
      if (messageId) {
        await telegramNotifier.editMessageReplyMarkup(String(staff.id), messageId, rows);
      } else {
        await telegramNotifier.send(String(staff.id), {
          kind: 'telegram',
          text: `Заявка #${lead.id}: выберите новый статус`,
          keyboard: rows,
        });
      }
      return;
    }

    case 'status_set': {
      const next = data.split(':')[2] as LeadStatus;
      try {
        const updated = await changeLeadStatus(lead.id, next, {
          actorId: staff.id,
          actorLabel: staff.name,
        });
        await notifyStaff(staff.id, `Заявка #${updated.id} → ${LEAD_STATUS_LABELS[updated.status]}`);
        await broadcastCard(updated, `Заявка #${updated.id} → ${LEAD_STATUS_LABELS[updated.status]}`);
      } catch (error) {
        await notifyStaff(staff.id, error instanceof Error ? error.message : 'Не удалось сменить статус');
      }
      return;
    }

    case 'lost_menu': {
      const reasons = [
        { text: 'Дорого', callback_data: `lost_set:${lead.id}:expensive` },
        { text: 'Выбрали другую', callback_data: `lost_set:${lead.id}:other_company` },
        { text: 'Не отвечает', callback_data: `lost_set:${lead.id}:no_answer` },
        { text: 'Передумал', callback_data: `lost_set:${lead.id}:changed_mind` },
        { text: 'Вне зоны', callback_data: `lost_set:${lead.id}:out_of_area` },
        { text: 'Другое', callback_data: `lost_set:${lead.id}:other` },
      ].map((reason) => [reason]);
      await telegramNotifier.send(String(staff.id), {
        kind: 'telegram',
        text: `Заявка #${lead.id}: почему отказ?`,
        keyboard: reasons,
      });
      return;
    }

    case 'lost_set': {
      const reason = data.split(':')[2];
      try {
        await changeLeadStatus(lead.id, 'lost', {
          actorId: staff.id,
          actorLabel: staff.name,
          lostReason: reason,
        });
        await notifyStaff(staff.id, `Заявка #${lead.id} помечена как отказ`);
      } catch (error) {
        await notifyStaff(staff.id, error instanceof Error ? error.message : 'Не удалось сохранить отказ');
      }
      return;
    }

    case 'spam': {
      try {
        await changeLeadStatus(lead.id, 'spam', { actorId: staff.id, actorLabel: staff.name });
        await notifyStaff(staff.id, `Заявка #${lead.id} помечена как спам`);
      } catch (error) {
        await notifyStaff(staff.id, error instanceof Error ? error.message : 'Не удалось помечать спамом');
      }
      return;
    }

    case 'measure_menu': {
      const rules = await store.getMeasurementRules();
      const blackouts = await store.listBlackoutDates();
      const busy = await store.listMeasurements({
        from: new Date().toISOString(),
        to: new Date(Date.now() + (rules.horizonDays + 2) * 24 * 3600_000).toISOString(),
      });
      const slots = generateSlots({ rules, blackoutDates: blackouts, busy })
        .filter((slot) => slot.available)
        .slice(0, 8);

      if (slots.length === 0) {
        await notifyStaff(staff.id, 'Свободных слотов нет. Откройте админку и добавьте рабочие часы.');
        return;
      }

      const rows = slots.map((slot) => [
        { text: slot.label, callback_data: `measure_set:${lead.id}:${slot.startsAt}` },
      ]);
      await telegramNotifier.send(String(staff.id), {
        kind: 'telegram',
        text: `Заявка #${lead.id}: выберите время замера`,
        keyboard: rows,
      });
      return;
    }

    case 'measure_set': {
      const startsAt = data.split(':').slice(2).join(':');
      const rules = await store.getMeasurementRules();
      const start = new Date(startsAt);
      if (Number.isNaN(start.getTime())) return;

      await store.createMeasurement({
        lead_id: lead.id,
        starts_at: start.toISOString(),
        ends_at: new Date(start.getTime() + rules.slotMinutes * 60_000).toISOString(),
        district: lead.district,
        street: null,
        house: null,
        flat: null,
        status: 'confirmed',
        assignee_id: staff.id,
        notes: 'Назначено из Telegram',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (canTransition(lead.status, 'measure_booked')) {
        await changeLeadStatus(lead.id, 'measure_booked', { actorId: staff.id, actorLabel: staff.name });
      }

      await store.addLeadEvent({
        lead_id: lead.id,
        type: 'measure_confirmed',
        actor_id: staff.id,
        actor_label: staff.name,
        payload: { startsAt },
        created_at: new Date().toISOString(),
      });

      // Кнопка WhatsApp: текст подтверждения отправляет человек, а не бот (§8.3).
      const config = await getSiteConfig();
      const text = measureConfirmationText(
        lead,
        { starts_at: start.toISOString() } as any,
        config.phonePrimary,
      );
      await telegramNotifier.send(String(staff.id), {
        kind: 'telegram',
        text: `Замер для заявки #${lead.id} назначен.\n\nОтправьте клиенту подтверждение:`,
        keyboard: [[{ text: '💬 Отправить подтверждение', url: whatsappLink(lead.phone, text) }]],
      });
      return;
    }

    case 'review': {
      const config = await getSiteConfig();
      await telegramNotifier.send(String(staff.id), {
        kind: 'telegram',
        text: `Просьба об отзыве для заявки #${lead.id} — ${lead.name}`,
        keyboard: [
          [
            {
              text: '⭐️ Открыть WhatsApp',
              url: whatsappLink(lead.phone, reviewRequestText(lead, config.gisReviews)),
            },
          ],
        ],
      });
      await store.updateLead(lead.id, { review_requested_at: new Date().toISOString() });
      await store.addLeadEvent({
        lead_id: lead.id,
        type: 'review_requested',
        actor_id: staff.id,
        actor_label: staff.name,
        payload: null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    default:
      return;
  }
}

async function notifyStaff(staffId: number, text: string): Promise<void> {
  const staff = await getStore().findStaffByTelegramId(String(staffId));
  if (!staff) return;
  await telegramNotifier.send(String(staff.telegram_id), { kind: 'telegram', text });
}

/** Обновляет карточку у остальных сотрудников: «Взял: Имя». */
async function broadcastCard(lead: Lead, prefix: string): Promise<void> {
  const staff = await getStore().listStaff(true);
  for (const member of staff) {
    if (member.role === 'owner') continue; // владельцу не дублируем в личку
    await telegramNotifier.send(String(member.telegram_id), {
      kind: 'telegram',
      text: `${prefix}\n\n${lead.name} · ${formatPhone(lead.phone)}`,
      keyboard: leadKeyboard(lead),
    });
  }
}

export { isOpenStatus };
