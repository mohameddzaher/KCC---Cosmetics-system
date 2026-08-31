import nodemailer, { type Transporter } from 'nodemailer';
import connectDB from '@/lib/db';
import SiteSettings from '@/models/SiteSettings';

/**
 * Outgoing email.
 *
 * The admin panel has had a Notification Preferences screen for a while, but
 * nothing behind it — the toggles saved and no mail was ever sent. This is the
 * missing half: every toggle on that screen maps to one `MailEvent` here, and
 * an event only goes out if its toggle is on and there is somewhere to send it.
 *
 * Two rules, both deliberate:
 *   1. Mail NEVER breaks the request that triggered it. An order is placed
 *      whether or not the SMTP host answers.
 *   2. With no SMTP credentials configured, this is a silent no-op that reports
 *      itself as unconfigured, so the settings screen can say so out loud
 *      instead of implying mail is working.
 */

export type MailEvent =
  | 'emailNewOrder'
  | 'emailOrderStatusChange'
  | 'emailLowStock'
  | 'emailNewCustomer'
  | 'emailPaymentReceived';

export interface MailerStatus {
  configured: boolean;
  host?: string;
  from?: string;
  /** Which environment variables are still missing. */
  missing: string[];
}

function env() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
  };
}

export function mailerStatus(): MailerStatus {
  const e = env();
  const missing: string[] = [];
  if (!e.host) missing.push('SMTP_HOST');
  if (!e.user) missing.push('SMTP_USER');
  if (!e.pass) missing.push('SMTP_PASS');
  if (!e.from) missing.push('SMTP_FROM');
  return { configured: missing.length === 0, host: e.host, from: e.from, missing };
}

let cached: Transporter | null = null;

function transporter(): Transporter | null {
  if (!mailerStatus().configured) return null;
  if (cached) return cached;
  const e = env();
  cached = nodemailer.createTransport({
    host: e.host,
    port: e.port,
    secure: e.secure,
    auth: { user: e.user, pass: e.pass },
  });
  return cached;
}

/* ------------------------------------------------------------------ */
/* Message body                                                        */
/* ------------------------------------------------------------------ */

export interface MailBody {
  subject: string;
  heading: string;
  /** Label/value pairs shown as a table. */
  rows?: Array<[string, string]>;
  intro?: string;
  actionUrl?: string;
  actionLabel?: string;
}

function render(body: MailBody): string {
  const rows = (body.rows || [])
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#8a7f74;font-size:13px;width:40%">${esc(k)}</td>` +
        `<td style="padding:8px 0;color:#2b2119;font-size:13px;font-weight:600">${esc(v)}</td></tr>`
    )
    .join('');

  const button =
    body.actionUrl && body.actionLabel
      ? `<a href="${esc(body.actionUrl)}" style="display:inline-block;margin-top:24px;background:#1f4d3d;color:#fff;` +
        `text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(
          body.actionLabel
        )}</a>`
      : '';

  return `<!doctype html><html><body style="margin:0;background:#f6f2ec;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #eee6dc">
        <span style="font-size:15px;font-weight:700;letter-spacing:.12em;color:#1f4d3d">KCC</span>
        <span style="font-size:11px;color:#8a7f74;letter-spacing:.16em"> &nbsp;SAUDI COMPANY FOR COSMETICS</span>
      </td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#2b2119">${esc(body.heading)}</h1>
        ${body.intro ? `<p style="margin:0 0 20px;color:#6b6158;font-size:14px;line-height:1.6">${esc(body.intro)}</p>` : ''}
        ${rows ? `<table role="presentation" width="100%">${rows}</table>` : ''}
        ${button}
      </td></tr>
      <tr><td style="padding:18px 32px;background:#faf7f2;color:#a09488;font-size:11px">
        Sent automatically by the KCC admin system. Change what gets emailed under Settings &rarr; Notifications.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

/** Who should receive this event, per the admin's Notification Preferences. */
async function recipientsFor(event: MailEvent): Promise<string[]> {
  await connectDB();
  const settings = (await SiteSettings.findOne({ key: 'main' }).lean()) as {
    notifications?: Record<string, unknown>;
  } | null;
  const n = settings?.notifications || {};
  if (n[event] === false) return [];

  return String(n.recipientEmails || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}

/**
 * Send one event email. Resolves to what happened rather than throwing, so a
 * caller can log it without wrapping every call site in its own try/catch.
 */
export async function sendEventEmail(
  event: MailEvent,
  body: MailBody
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const t = transporter();
    if (!t) return { sent: false, reason: 'smtp-not-configured' };

    const to = await recipientsFor(event);
    if (to.length === 0) return { sent: false, reason: 'no-recipients-or-disabled' };

    await t.sendMail({
      from: env().from,
      to,
      subject: body.subject,
      html: render(body),
    });
    return { sent: true };
  } catch (e) {
    // Never surface a mail failure to the user who triggered it.
    console.error(`[mailer] ${event} failed:`, e instanceof Error ? e.message : e);
    return { sent: false, reason: 'send-failed' };
  }
}

/** Used by the settings screen's "send a test" button. */
export async function sendTestEmail(to: string): Promise<{ sent: boolean; error?: string }> {
  const t = transporter();
  if (!t) return { sent: false, error: `SMTP not configured (missing ${mailerStatus().missing.join(', ')})` };
  try {
    await t.sendMail({
      from: env().from,
      to,
      subject: 'KCC — test email',
      html: render({
        subject: 'KCC — test email',
        heading: 'Email is working',
        intro:
          'If you are reading this, the admin system can send mail. Order, stock and payment notifications will arrive here.',
      }),
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'Send failed' };
  }
}

/** Absolute link back into the admin panel, for the button in each email. */
export function adminUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}
