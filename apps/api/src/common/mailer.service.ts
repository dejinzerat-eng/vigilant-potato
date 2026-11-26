import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from './config';

/** Odesílání e-mailů přes Resend API. Bez klíče se e-maily jen vypisují do logu (vývoj). */
@Injectable()
export class MailerService {
  private log = new Logger('Mailer');
  async send(to: string, subject: string, html: string) {
    if (!config.resendKey) { this.log.log(`[DEV e-mail] ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ')}`); return; }
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.mailFrom, to, subject, html }),
    });
    if (!r.ok) this.log.error(`E-mail se nepodařilo odeslat: ${r.status} ${await r.text()}`);
  }
}

/**
 * SMS pro ověření telefonu přes GoSMS.cz (OAuth client credentials, REST API v1).
 * Bez klíčů se kód ve vývoji jen vypíše do logu; v produkci se ověření telefonu nabídne až po nastavení brány.
 */
@Injectable()
export class SmsService {
  private log = new Logger('SMS');
  private token?: { value: string; expires: number };
  private channel?: number;

  get enabled() { return !!(config.gosms.clientId && config.gosms.clientSecret); }

  private async accessToken() {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const body = new URLSearchParams({ client_id: config.gosms.clientId!, client_secret: config.gosms.clientSecret!, grant_type: 'client_credentials' });
    const r = await fetch(`${config.gosms.apiBase}/oauth/v2/token`, { method: 'POST', body });
    if (!r.ok) throw new Error(`GoSMS token ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { access_token: string; expires_in?: number };
    this.token = { value: j.access_token, expires: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return j.access_token;
  }

  /** ID kanálu: z proměnné GOSMS_CHANNEL, jinak první kanál organizace. */
  private async channelId(token: string) {
    if (config.gosms.channel) return config.gosms.channel;
    if (this.channel) return this.channel;
    const r = await fetch(`${config.gosms.apiBase}/api/v1`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`GoSMS organizace ${r.status}: ${await r.text()}`);
    const j = (await r.json()) as { channels?: { id: number }[] };
    const id = j.channels?.[0]?.id;
    if (!id) throw new Error('GoSMS: účet nemá žádný kanál pro odesílání.');
    this.channel = id;
    return id;
  }

  async send(phone: string, text: string) {
    if (!this.enabled) {
      if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Ověření telefonu bude dostupné po spuštění SMS brány.');
      this.log.log(`[DEV SMS] ${phone}: ${text}`);
      return;
    }
    try {
      const token = await this.accessToken();
      const channel = await this.channelId(token);
      const r = await fetch(`${config.gosms.apiBase}/api/v1/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, recipients: phone, channel }),
      });
      if (r.status === 401) this.token = undefined;
      if (!r.ok) throw new Error(`GoSMS odeslání ${r.status}: ${await r.text()}`);
    } catch (e) {
      this.log.error((e as Error).message);
      throw new ServiceUnavailableException('SMS se nepodařilo odeslat. Zkuste to prosím za chvíli.');
    }
  }
}
