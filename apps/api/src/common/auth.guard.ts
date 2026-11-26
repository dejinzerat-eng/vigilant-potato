import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

export const SESSION_COOKIE = 'dej_session';
export interface AuthUser { id: string; role: Role; name: string; email: string; emailVerified: boolean; phoneVerified: boolean }

export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

const AUTH_KEY = 'auth';
/** 'required' = přihlášení nutné, 'optional' = uživatel se načte, pokud je přihlášen */
export const Auth = (mode: 'required' | 'optional' = 'required', ...roles: Role[]) => SetMetadata(AUTH_KEY, { mode, roles });
export const Roles = (...roles: Role[]) => Auth('required', ...roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser | undefined);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService, private redis: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ mode: string; roles: Role[] }>(AUTH_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = req.cookies?.[SESSION_COOKIE] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    if (token) req.user = (await this.resolve(token)) ?? undefined;
    if (!meta || meta.mode === 'optional') return true;
    if (!req.user) throw new UnauthorizedException('Pro tuto akci se musíte přihlásit.');
    if (meta.roles?.length && !meta.roles.includes(req.user.role) && req.user.role !== 'ADMIN') throw new ForbiddenException('Nemáte oprávnění.');
    return true;
  }

  private async resolve(token: string): Promise<AuthUser | null> {
    const h = hashToken(token);
    const cached = await this.redis.get(`sess:${h}`);
    if (cached) return cached === '-' ? null : JSON.parse(cached);
    const s = await this.prisma.refreshToken.findUnique({ where: { tokenHash: h }, include: { user: true } });
    let u: AuthUser | null = null;
    if (s && !s.revokedAt && s.expiresAt > new Date() && s.user.status === 'ACTIVE') {
      u = { id: s.user.id, role: s.user.role, name: s.user.name, email: s.user.email, emailVerified: !!s.user.emailVerifiedAt, phoneVerified: !!s.user.phoneVerifiedAt };
    }
    await this.redis.set(`sess:${h}`, u ? JSON.stringify(u) : '-', 60);
    return u;
  }
}
