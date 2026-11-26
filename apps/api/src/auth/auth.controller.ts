import { Body, Controller, Get, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Auth, AuthUser, CurrentUser, SESSION_COOKIE } from '../common/auth.guard';
import { verifyCaptcha } from '../common/captcha';
import { config } from '../common/config';
import { SmsService } from '../common/mailer.service';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod';
import { AuthService } from './auth.service';

const password = z.string().min(8, 'Heslo musí mít alespoň 8 znaků.').max(200);
const RegisterDto = z.object({ email: z.email('Zadejte platný e-mail.'), password, name: z.string().trim().min(2, 'Zadejte jméno.').max(60), captcha: z.string().optional(), terms: z.literal(true, { error: 'Je potřeba souhlasit s podmínkami.' }) });
const LoginDto = z.object({ email: z.email('Zadejte platný e-mail.'), password: z.string().min(1, 'Zadejte heslo.') });

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private prisma: PrismaService, private sms: SmsService) {}

  private setCookie(res: Response, token: string, expires: Date) {
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, expires, path: '/' });
  }

  @Get('providers')
  providers() {
    const a = config.apple;
    return { google: !!config.google.clientId, apple: !!(a.clientId && a.teamId && a.keyId && a.privateKey), sms: this.sms.enabled, captchaSiteKey: process.env.TURNSTILE_SITE_KEY ?? null };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body(new ZodPipe(RegisterDto)) dto: z.infer<typeof RegisterDto>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await verifyCaptcha(dto.captcha, req.ip);
    const user = await this.auth.register(dto.email, dto.password, dto.name);
    const s = await this.auth.createSession(user.id);
    this.setCookie(res, s.token, s.expiresAt);
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body(new ZodPipe(LoginDto)) dto: z.infer<typeof LoginDto>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto.email, dto.password, req.ip ?? '');
    const s = await this.auth.createSession(user.id);
    this.setCookie(res, s.token, s.expiresAt);
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const t = req.cookies?.[SESSION_COOKIE];
    if (t) await this.auth.revokeSession(t);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Auth('optional')
  @Get('me')
  async me(@CurrentUser() u?: AuthUser) {
    if (!u) return { user: null };
    const user = await this.prisma.user.findUnique({
      where: { id: u.id },
      select: { id: true, email: true, name: true, role: true, phone: true, avatarUrl: true, city: true, region: true, bio: true, isBusiness: true, companyName: true, companyId: true, emailVerifiedAt: true, phoneVerifiedAt: true, createdAt: true, passwordHash: true },
    });
    if (!user) return { user: null };
    const [unreadMessages, unreadNotifications] = await Promise.all([
      this.prisma.message.count({ where: { readAt: null, senderId: { not: u.id }, conversation: { OR: [{ buyerId: u.id }, { sellerId: u.id }] } } }),
      this.prisma.notification.count({ where: { userId: u.id, readAt: null } }),
    ]);
    const { passwordHash, ...rest } = user;
    return { user: { ...rest, hasPassword: !!passwordHash, unreadMessages, unreadNotifications } };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) { await this.auth.verifyEmail(token ?? ''); return { ok: true }; }

  @Auth()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-verification')
  async resend(@CurrentUser() u: AuthUser) {
    await this.auth.sendEmailVerification(await this.prisma.user.findUniqueOrThrow({ where: { id: u.id } }));
    return { ok: true };
  }

  @Auth()
  @Post('phone/send')
  phoneSend(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ phone: z.string().regex(/^\+?(420|421)?\s?\d{3}\s?\d{3}\s?\d{3}$/, 'Zadejte platné české nebo slovenské číslo.') }))) dto: { phone: string }) {
    let p = dto.phone.replace(/\s/g, '');
    if (!p.startsWith('+')) p = p.length === 9 ? `+420${p}` : `+${p}`;
    return this.auth.sendPhoneCode(u.id, p);
  }

  @Auth()
  @Post('phone/verify')
  async phoneVerify(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ code: z.string().length(6, 'Kód má 6 číslic.') }))) dto: { code: string }) {
    await this.auth.verifyPhone(u.id, dto.code); return { ok: true };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('password/forgot')
  async forgot(@Body(new ZodPipe(z.object({ email: z.email('Zadejte platný e-mail.') }))) dto: { email: string }) { await this.auth.forgotPassword(dto.email); return { ok: true }; }

  @Post('password/reset')
  async reset(@Body(new ZodPipe(z.object({ token: z.string().min(10), password }))) dto: { token: string; password: string }) { await this.auth.resetPassword(dto.token, dto.password); return { ok: true }; }

  @Auth()
  @Post('password/change')
  async change(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ current: z.string().default(''), password }))) dto: { current: string; password: string }) {
    await this.auth.changePassword(u.id, dto.current, dto.password); return { ok: true };
  }

  @Auth()
  @Post('sessions/revoke-all')
  async revokeAll(@CurrentUser() u: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.revokeAll(u.id); res.clearCookie(SESSION_COOKIE, { path: '/' }); return { ok: true };
  }

  @Get('google')
  google(@Res() res: Response) {
    if (!config.google.clientId) return res.redirect(`${config.webOrigin}/prihlaseni?chyba=google`);
    const state = randomBytes(16).toString('hex');
    res.cookie('dej_oauth', state, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: 600_000, path: '/' });
    return res.redirect(this.auth.googleAuthUrl(state));
  }

  @Get('google/callback')
  async googleCb(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    if (!state || state !== req.cookies?.dej_oauth) throw new UnauthorizedException('Neplatný požadavek.');
    const user = await this.auth.googleCallback(code);
    const s = await this.auth.createSession(user.id);
    this.setCookie(res, s.token, s.expiresAt);
    res.clearCookie('dej_oauth', { path: '/' });
    return res.redirect(`${config.webOrigin}/`);
  }

  @Get('apple')
  apple(@Res() res: Response) {
    const a = config.apple;
    if (!(a.clientId && a.teamId && a.keyId && a.privateKey)) return res.redirect(`${config.webOrigin}/prihlaseni?chyba=apple`);
    const state = randomBytes(16).toString('hex');
    // Apple vrací odpověď jako POST z appleid.apple.com, proto musí cookie se stavem projít i mezi weby (SameSite=None).
    res.cookie('dej_oauth_apple', state, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 600_000, path: '/' });
    return res.redirect(this.auth.appleAuthUrl(state));
  }

  @Post('apple/callback')
  async appleCb(@Body() body: { code?: string; state?: string; user?: string; error?: string }, @Req() req: Request, @Res() res: Response) {
    res.clearCookie('dej_oauth_apple', { path: '/', sameSite: 'none', secure: true });
    if (body?.error) return res.redirect(`${config.webOrigin}/prihlaseni`);
    if (!body?.code || !body.state || body.state !== req.cookies?.dej_oauth_apple) throw new UnauthorizedException('Neplatný požadavek.');
    const user = await this.auth.appleCallback(body.code, body.user);
    const s = await this.auth.createSession(user.id);
    this.setCookie(res, s.token, s.expiresAt);
    return res.redirect(`${config.webOrigin}/`);
  }
}
