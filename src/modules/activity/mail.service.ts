import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Pengirim email lewat SMTP. Tanpa MAIL_HOST semua pengiriman dilewati diam-diam. */
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private transporter: nodemailer.Transporter | null = null;
  readonly enabled: boolean;
  private readonly from: string;
  private readonly appUrl: string;

  constructor() {
    const host = (process.env.MAIL_HOST ?? '').trim();
    this.enabled = !!host;
    this.from = (process.env.MAIL_FROM ?? '').trim() || `Garap <no-reply@${host || 'localhost'}>`;
    this.appUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.MAIL_PORT ?? 587),
        secure: String(process.env.MAIL_SECURE ?? 'false') === 'true',
        auth: process.env.MAIL_USER ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS ?? '' } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      });
    }
  }

  /** Kirim satu email. Mengembalikan true bila diterima server SMTP; tidak pernah melempar galat. */
  async send(to: string, subject: string, text: string, html: string): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, html });
      return true;
    } catch (e) {
      this.log.warn(`Gagal mengirim email ke ${to}: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }

  /** Email notifikasi: judul + tombol buka. href relatif terhadap FRONTEND_URL. */
  sendNotification(to: string, opts: { name: string; text: string; target?: string; href: string; actor?: string }) {
    const link = `${this.appUrl}${opts.href.startsWith('/') ? opts.href : `/${opts.href}`}`;
    const prefs = `${this.appUrl}/pengaturan/notifikasi`;
    const subject = `[Garap] ${opts.text}`.slice(0, 150);
    const text = [`Halo ${opts.name},`, '', opts.text, opts.target ? `“${opts.target}”` : '', '', `Buka: ${link}`, '', `Atur notifikasi: ${prefs}`].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    const html = `<!doctype html><html><body style="margin:0;background:#FBFBFC;font-family:Inter,system-ui,sans-serif;color:#1A1B1F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #E7E7EB;border-radius:14px">
<tr><td style="padding:22px 24px 6px;font-size:13px;color:#6B6F80">Halo ${esc(opts.name)},</td></tr>
<tr><td style="padding:4px 24px 0;font-size:16px;font-weight:600;line-height:1.45">${esc(opts.text)}</td></tr>
${opts.target ? `<tr><td style="padding:6px 24px 0;font-size:14px;color:#3B3D42">${esc(opts.target)}</td></tr>` : ''}
<tr><td style="padding:20px 24px 24px"><a href="${esc(link)}" style="display:inline-block;background:#5E6AD2;color:#fff;text-decoration:none;font-size:13px;font-weight:500;padding:10px 16px;border-radius:8px">Buka di Garap</a></td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #EEEEF1;font-size:11.5px;color:#9A9CAB">Email ini dikirim otomatis oleh Garap. <a href="${esc(prefs)}" style="color:#6B6F80">Atur notifikasi</a></td></tr>
</table></td></tr></table></body></html>`;
    return this.send(to, subject, text, html);
  }
}
