/**
 * Шаблоны сообщений (Приложение C мастер-промпта).
 *
 * Все тексты — на русском и в одном месте, чтобы менеджер мог править
 * формулировки, не залезая в логику. WhatsApp-сообщения отправляет человек
 * кнопкой «Открыть WhatsApp», а не бот: так соблюдаются правила WhatsApp о
 * нежелательных рассылках (§8.5).
 */

import { PRODUCT_TYPE_LABELS } from '@/content/site';
import type { Lead, Measurement } from '@/lib/db/types';
import { formatPhone, phoneToWaId } from '@/lib/phone';
import { formatSlotLabel } from '@/lib/domain/measurements';
import { sourceLabel } from '@/lib/domain/attribution';
import { LOST_REASON_LABELS } from '@/lib/domain/statuses';
import { formatMoney } from '@/lib/utils';

export interface CardContext {
  /** Часовой пояс для отображения времени заявки. */
  timeZone: string;
  /** Куда ведёт кнопка WhatsApp. */
  whatsappPhone: string;
  /** Короткие параметры калькулятора, собранные из calc_payload. */
  calcSummary?: string | null;
}

/** Краткая сводка конфигурации калькулятора: «1400×1500, 2 створки, ПО». */
export function summarizeCalc(calc: Record<string, any> | null | undefined): string | null {
  if (!calc) return null;
  const parts: string[] = [];
  if (calc.widthMm && calc.heightMm) parts.push(`${calc.widthMm}×${calc.heightMm} мм`);
  if (calc.sections) parts.push(`${calc.sections} ств.`);
  const opening: Record<string, string> = {
    fixed: 'глухое',
    turn: 'поворотное',
    'tilt-turn': 'поворотно-откидное',
    sliding: 'сдвижное',
  };
  if (calc.opening && opening[calc.opening]) parts.push(opening[calc.opening]);
  if (calc.glazing) parts.push(String(calc.glazing));
  if (calc.quantity && calc.quantity > 1) parts.push(`${calc.quantity} шт`);
  if (Array.isArray(calc.options) && calc.options.length) parts.push(calc.options.join(', '));
  if (calc.needInstall === false) parts.push('без монтажа');
  return parts.length ? parts.join(', ') : null;
}

function leadLabels(lead: Lead): string {
  const labels: string[] = [];
  if (lead.segment === 'b2b') labels.push('🏢 B2B');
  if (lead.priority === 'high') labels.push('⚡ срочно');
  return labels.length ? `  ${labels.join(' | ')}` : '';
}

/**
 * Карточка новой заявки в Telegram. Только то, что нужно для работы: имя,
 * телефон, параметры заказа. Никаких лишних персональных данных (§10).
 */
export function leadCardText(lead: Lead, context: CardContext): string {
  const lines: string[] = [];
  lines.push(`🆕 Заявка #${lead.id}${leadLabels(lead)}`);
  lines.push('');
  lines.push(`👤 ${lead.name}`);
  lines.push(`📞 ${formatPhone(lead.phone)}`);
  lines.push(`🧱 ${lead.product_type ? PRODUCT_TYPE_LABELS[lead.product_type] ?? lead.product_type : 'не указано'}`);

  const summary = context.calcSummary ?? summarizeCalc(lead.calc_payload);
  if (summary) lines.push(`📐 ${summary}`);
  if (lead.district) lines.push(`📍 ${lead.district}`);
  if (lead.email) lines.push(`✉️ ${lead.email}`);
  if (lead.comment) lines.push(`💬 ${lead.comment}`);

  const utmBits = lead.utm
    ? Object.entries(lead.utm)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => `${key.replace('utm_', '')}=${value}`)
        .join(', ')
    : '';
  lines.push(`🔗 Источник: ${sourceLabel(lead.source)}${lead.request_path ? ` · ${lead.request_path}` : ''}`);
  if (utmBits) lines.push(`📊 UTM: ${utmBits}`);
  lines.push(`⏱ Получена: ${formatSlotLabel(lead.created_at, context.timeZone)}`);

  return lines.join('\n');
}

/** Карточка подтверждения SLA-нарушения — уходит владельцу (§8.4). */
export function slaEscalationText(lead: Lead, minutesWaiting: number): string {
  return [
    '⚠️ Заявка не взята в работу',
    '',
    `Заявка #${lead.id} ждёт уже ${minutesWaiting} мин.`,
    `👤 ${lead.name}`,
    `📞 ${formatPhone(lead.phone)}`,
    `🧱 ${lead.product_type ? PRODUCT_TYPE_LABELS[lead.product_type] ?? lead.product_type : 'не указано'}`,
    '',
    'Проверьте, пожалуйста, что с ней происходит.',
  ].join('\n');
}

/** Утренний дайджест 09:00 Asia/Almaty (§10). */
export function digestText(input: {
  dateLabel: string;
  newLeads: Lead[];
  measurements: (Measurement & { leadName?: string; leadPhone?: string })[];
}): string {
  const lines: string[] = [`☀️ Доброе утро. Сводка на ${input.dateLabel}`, ''];

  lines.push(`Необработанных заявок: ${input.newLeads.length}`);
  for (const lead of input.newLeads.slice(0, 10)) {
    lines.push(`• #${lead.id} ${lead.name} · ${formatPhone(lead.phone)}`);
  }
  if (input.newLeads.length > 10) lines.push(`…и ещё ${input.newLeads.length - 10}`);

  lines.push('');
  lines.push(`Замеров сегодня: ${input.measurements.length}`);
  for (const measurement of input.measurements) {
    const time = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Almaty',
    }).format(new Date(measurement.starts_at));
    const address = [measurement.street, measurement.house, measurement.flat].filter(Boolean).join(', ');
    lines.push(`• ${time} — ${measurement.leadName ?? 'клиент'}${address ? `, ${address}` : ''}`);
  }

  return lines.join('\n');
}

/** Напоминание замерщику накануне вечером и за 2 часа (§8.3). */
export function measurementReminderText(
  measurement: Measurement,
  lead: Lead,
  when: 'tomorrow' | 'soon',
): string {
  const address = [measurement.district, measurement.street, measurement.house, measurement.flat]
    .filter(Boolean)
    .join(', ');
  return [
    when === 'tomorrow' ? '📅 Замер завтра' : '⏰ Замер через 2 часа',
    '',
    `Заявка #${lead.id}`,
    `👤 ${lead.name}`,
    `📞 ${formatPhone(lead.phone)}`,
    `🕒 ${formatSlotLabel(measurement.starts_at, 'Asia/Almaty')}`,
    address ? `📍 ${address}` : '',
    measurement.notes ? `💬 ${measurement.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Напоминание менеджеру запросить отзыв после монтажа (§8.5). */
export function reviewReminderText(lead: Lead): string {
  return [
    '⭐️ Монтаж завершён — попросите отзыв',
    '',
    `Заявка #${lead.id}`,
    `👤 ${lead.name}`,
    `📞 ${formatPhone(lead.phone)}`,
    '',
    'Нажмите кнопку ниже: откроется WhatsApp с готовым текстом.',
  ].join('\n');
}

/** Ответ на смену статуса, чтобы менеджер видел, что нажатие сработало. */
export function statusChangeText(lead: Lead, label: string): string {
  return `Заявка #${lead.id} → ${label}`;
}

// ------------------------------------------------- WhatsApp (открывает человек)

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phoneToWaId(phone)}?text=${encodeURIComponent(text)}`;
}

export function whatsappGeneralText(lead: Pick<Lead, 'product_type' | 'district' | 'id'>): string {
  const product = lead.product_type ? PRODUCT_TYPE_LABELS[lead.product_type] ?? lead.product_type : 'окна';
  return `Здравствуйте! Пишу с сайта. Интересует: ${product}.${
    lead.district ? ` Район: ${lead.district}.` : ''
  }`;
}

export function whatsappCalculatorText(lead: Lead): string {
  const calc = lead.calc_payload as Record<string, any> | null;
  const product = lead.product_type ? PRODUCT_TYPE_LABELS[lead.product_type] ?? lead.product_type : 'конструкцию';
  if (!calc) return whatsappGeneralText(lead);
  return `Здравствуйте! Хочу рассчитать: ${product}, ${calc.widthMm}×${calc.heightMm} мм, ${calc.sections} ств. Заявка с сайта №${lead.id}.`;
}

export function whatsappMeasureRequestText(lead: Lead, measurement?: Measurement): string {
  if (!measurement) return whatsappGeneralText(lead);
  return `Здравствуйте! Хочу записаться на замер на ${formatSlotLabel(measurement.starts_at, 'Asia/Almaty')}. Заявка №${lead.id}.`;
}

/** Подтверждение замера — текст, который менеджер отправляет сам (§8.3). */
export function measureConfirmationText(
  lead: Lead,
  measurement: Measurement,
  companyPhone: string,
): string {
  const address = [measurement.district, measurement.street, measurement.house, measurement.flat]
    .filter(Boolean)
    .join(', ');
  return `Здравствуйте, ${lead.name}! Подтверждаем замер ${formatSlotLabel(
    measurement.starts_at,
    'Asia/Almaty',
  )}${address ? `, адрес: ${address}` : ''}. Если планы изменятся — напишите нам. СПФ Регион Строй, ${formatPhone(
    companyPhone,
  )}.`;
}

export function reviewRequestText(lead: Lead, gisReviewsUrl: string): string {
  return `Здравствуйте, ${lead.name}! Спасибо, что выбрали СПФ Регион Строй. Если у вас есть минутка, поделитесь, пожалуйста, впечатлением о работе — отзыв можно оставить здесь: ${gisReviewsUrl}. Нам важно ваше мнение.`;
}

export function leadSummaryForEmail(lead: Lead, context: CardContext): { subject: string; text: string } {
  return {
    subject: `Новая заявка #${lead.id} — ${lead.name}, ${formatPhone(lead.phone)}`,
    text: [
      leadCardText(lead, context),
      '',
      `Статус: ${LOST_REASON_LABELS[lead.status] ?? lead.status}`,
      'Откройте админку, чтобы взять заявку в работу.',
    ].join('\n'),
  };
}

export function priceLabel(low: number, high: number, currency: string): string {
  return `${formatMoney(low, currency === 'KZT' ? '₸' : currency)} – ${formatMoney(high, currency === 'KZT' ? '₸' : currency)}`;
}
