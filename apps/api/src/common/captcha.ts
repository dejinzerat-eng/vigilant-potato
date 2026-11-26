import { BadRequestException } from '@nestjs/common';
import { config } from './config';

/** Ověření Cloudflare Turnstile (CAPTCHA). Bez nastaveného klíče se přeskočí. */
export async function verifyCaptcha(token: string | undefined, ip?: string) {
  if (!config.turnstileSecret) return;
  if (!token) throw new BadRequestException('Potvrďte prosím, že nejste robot.');
  const body = new URLSearchParams({ secret: config.turnstileSecret, response: token, ...(ip ? { remoteip: ip } : {}) });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = (await r.json()) as { success: boolean };
  if (!j.success) throw new BadRequestException('Ověření proti robotům selhalo, zkuste to znovu.');
}
