/**
 * lib/leads/sinks/email.ts — необязательное дублирование заявки на email.
 * Поддерживает Resend (RESEND_API_KEY) и SMTP (SMTP_*).
 * Если переменные не заданы — sink считается ненастроенным и просто пропускается.
 */

import { buildMessage, type Lead, type Sink, type SinkResult } from '../types';

export function emailConfig():
  | { kind: 'resend'; apiKey: string; to: string; from: string }
  | { kind: 'smtp'; host: string; port: number; user: string; pass: string; to: string; from: string }
  | null {
  const to = process.env.LEAD_EMAIL_TO ?? '';
  if (!to) return null;

  const resendKey = process.env.RESEND_API_KEY ?? '';
  if (resendKey) {
    return {
      kind: 'resend',
      apiKey: resendKey,
      to,
      from: process.env.SMTP_FROM || 'СПФ Регион Строй <onboarding@resend.dev>',
    };
  }

  const host = process.env.SMTP_HOST ?? '';
  const user = process.env.SMTP_USER ?? '';
  const pass = process.env.SMTP_PASS ?? '';
  if (host && user && pass) {
    return {
      kind: 'smtp',
      host,
      port: Number(process.env.SMTP_PORT || 587),
      user,
      pass,
      to,
      from: process.env.SMTP_FROM || user,
    };
  }

  return null;
}

function subject(lead: Lead): string {
  return `Заявка с сайта: ${lead.needs} · ${lead.phone}`;
}

async function sendViaResend(
  config: Extract<NonNullable<ReturnType<typeof emailConfig>>, { kind: 'resend' }>,
  lead: Lead,
): Promise<SinkResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: subject(lead),
      text: buildMessage(lead),
    }),
  });
  return res.ok
    ? { sink: 'email', ok: true }
    : { sink: 'email', ok: false, error: `resend_${res.status}` };
}

async function sendViaSmtp(
  config: Extract<NonNullable<ReturnType<typeof emailConfig>>, { kind: 'smtp' }>,
  lead: Lead,
): Promise<SinkResult> {
  // nodemailer — необязательная зависимость: он есть в package.json,
  // но если его нет в окружении, сборка и остальные получатели не страдают.
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  await transport.sendMail({
    from: config.from,
    to: config.to,
    subject: subject(lead),
    text: buildMessage(lead),
    attachments: lead.files.map((f) => ({
      filename: f.name,
      content: Buffer.from(f.bytes),
      contentType: f.type,
    })),
  });

  return { sink: 'email', ok: true };
}

export const emailSink: Sink = {
  name: 'email',
  isConfigured(): boolean {
    return emailConfig() !== null;
  },
  async send(lead: Lead): Promise<SinkResult> {
    const config = emailConfig();
    if (!config) return { sink: 'email', ok: false, error: 'not_configured' };
    try {
      return config.kind === 'resend'
        ? await sendViaResend(config, lead)
        : await sendViaSmtp(config, lead);
    } catch (error) {
      return {
        sink: 'email',
        ok: false,
        error: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  },
};
