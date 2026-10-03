/**
 * lib/leads/sinks/webhook.ts — ЗАГЛУШКА для будущей CRM
 * (Bitrix24, amoCRM или Kommo). Не подключать без запроса владельца.
 *
 * Sink существует как подготовленная точка интеграции: пока CRM_WEBHOOK_URL
 * не задан, isConfigured() возвращает false и sink не участвует в доставке.
 */

import { buildMessage, type Lead, type Sink, type SinkResult } from '../types';

export function webhookUrl(): string | null {
  const url = process.env.CRM_WEBHOOK_URL ?? '';
  return url ? url : null;
}

export const webhookSink: Sink = {
  name: 'webhook',
  isConfigured(): boolean {
    return webhookUrl() !== null;
  },
  async send(lead: Lead): Promise<SinkResult> {
    const url = webhookUrl();
    if (!url) return { sink: 'webhook', ok: false, error: 'not_configured' };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: lead.mode,
          needs: lead.needs,
          objectType: lead.objectType,
          service: lead.service,
          count: lead.count,
          sizes: lead.sizes,
          address: lead.address,
          name: lead.name,
          phone: lead.phone,
          contactWay: lead.contactWay,
          comment: lead.comment,
          page: lead.page,
          utm: lead.utm,
          filesCount: lead.files.length,
          receivedAt: lead.receivedAt.toISOString(),
          requestId: lead.requestId,
          message: buildMessage(lead),
        }),
      });
      return res.ok
        ? { sink: 'webhook', ok: true }
        : { sink: 'webhook', ok: false, error: `webhook_${res.status}` };
    } catch (error) {
      return {
        sink: 'webhook',
        ok: false,
        error: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  },
};
