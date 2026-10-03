/** lib/leads/types.ts — общий тип заявки для всех получателей. */

export interface LeadFile {
  name: string;
  type: string;
  size: number;
  bytes: ArrayBuffer;
}

export interface Lead {
  mode: 'quick' | 'details';
  needs: string;
  objectType?: string;
  service?: string;
  count?: string;
  sizes?: string;
  address?: string;
  name?: string;
  /** Нормализованный телефон в формате +7XXXXXXXXXX */
  phone: string;
  contactWay?: 'whatsapp' | 'call';
  comment?: string;
  page?: string;
  utm?: string;
  files: LeadFile[];
  receivedAt: Date;
  requestId: string;
}

export interface SinkResult {
  sink: string;
  ok: boolean;
  error?: string;
}

export interface Sink {
  name: string;
  isConfigured(): boolean;
  send(lead: Lead): Promise<SinkResult>;
}

const EMPTY = '—';

/** Шаблон сообщения из раздела 11.4. */
export function buildMessage(lead: Lead): string {
  const way =
    lead.contactWay === 'whatsapp'
      ? 'WhatsApp'
      : lead.contactWay === 'call'
        ? 'звонок'
        : EMPTY;

  const time = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(lead.receivedAt);

  return [
    '🆕 Заявка с сайта СПФ Регион Строй',
    `Режим: ${lead.mode === 'quick' ? 'быстрая' : 'с деталями'}`,
    `Нужно: ${lead.needs || EMPTY}`,
    `Объект: ${lead.objectType || EMPTY}`,
    `Количество: ${lead.count || EMPTY}`,
    `Размеры: ${lead.sizes || EMPTY}`,
    `Адрес: ${lead.address || EMPTY}`,
    `Имя: ${lead.name || EMPTY}`,
    `Телефон: ${lead.phone}`,
    `Связь: ${way}`,
    `Комментарий: ${lead.comment || EMPTY}`,
    `Страница: ${lead.page || EMPTY}`,
    `Источник: ${lead.utm || 'нет'}`,
    `Фото: ${lead.files.length}`,
    `Время: ${time} (Asia/Almaty)`,
    `ID: ${lead.requestId}`,
  ].join('\n');
}

export function isHeic(type: string): boolean {
  return type === 'image/heic' || type === 'image/heif';
}
