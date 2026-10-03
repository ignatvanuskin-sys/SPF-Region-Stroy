/**
 * lib/leads/index.ts — доставка заявки получателям (раздел 11.4).
 *
 * Если НИ ОДИН получатель не настроен, интерфейс обязан показать честную
 * плашку «Форма сейчас не подключена», а не имитацию успеха.
 */

import { emailSink } from './sinks/email';
import { telegramSink } from './sinks/telegram';
import { webhookSink } from './sinks/webhook';
import type { Lead, Sink, SinkResult } from './types';

export * from './types';

export const SINKS: Sink[] = [telegramSink, emailSink, webhookSink];

export function configuredSinks(): Sink[] {
  return SINKS.filter((s) => s.isConfigured());
}

export function isLeadDeliveryConfigured(): boolean {
  return configuredSinks().length > 0;
}

export interface DeliveryResult {
  delivered: boolean;
  results: SinkResult[];
}

/** Отправляет заявку во все настроенные получатели. */
export async function deliverLead(lead: Lead): Promise<DeliveryResult> {
  const sinks = configuredSinks();
  if (sinks.length === 0) return { delivered: false, results: [] };

  const settled = await Promise.allSettled(sinks.map((sink) => sink.send(lead)));

  const results: SinkResult[] = settled.map((entry, i) =>
    entry.status === 'fulfilled'
      ? entry.value
      : { sink: sinks[i].name, ok: false, error: 'exception' },
  );

  return { delivered: results.some((r) => r.ok), results };
}

/** Безопасный для логов статус: без телефона, имени и текста заявки. */
export function logSafe(result: DeliveryResult, requestId: string): void {
  const summary = result.results.map((r) => `${r.sink}:${r.ok ? 'ok' : (r.error ?? 'fail')}`);
  console.info(`[lead] ${requestId} delivered=${result.delivered} sinks=[${summary.join(', ')}]`);
}
