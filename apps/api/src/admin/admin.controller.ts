import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { AuthUser, CurrentUser, Roles } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod';
import { AuthService } from '../auth/auth.service';
import { LISTING_INCLUDE, SearchService } from '../search/search.service';

/** Administrace. Moderátor: inzeráty a nahlášení. Admin: vše (uživatelé, kategorie, ceník, stránky). */
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService, private search: SearchService, private auth: AuthService) {}

  private audit(actor: AuthUser, action: string, targetType: string, targetId: string, meta?: unknown) {
    return this.prisma.auditLog.create({ data: { actorId: actor.id, action, targetType, targetId, meta: meta as Prisma.InputJsonValue } });
  }

  @Roles('MODERATOR')
  @Get('stats')
  async stats() {
    const day = new Date(Date.now() - 864e5), week = new Date(Date.now() - 7 * 864e5), month = new Date(Date.now() - 30 * 864e5);
    const [users, users7, listings, active, listings24, listings7, pending, reports, messages7, byCat] = await Promise.all([
      this.prisma.user.count(), this.prisma.user.count({ where: { createdAt: { gte: week } } }),
      this.prisma.listing.count({ where: { status: { not: 'DELETED' } } }), this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.listing.count({ where: { createdAt: { gte: day } } }), this.prisma.listing.count({ where: { createdAt: { gte: week } } }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }), this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.message.count({ where: { createdAt: { gte: week } } }),
      this.prisma.$queryRaw<{ name: string; n: bigint }[]>`SELECT p.name, COUNT(*)::bigint AS n FROM "Listing" l JOIN "Category" c ON c.id = l."categoryId" JOIN "Category" p ON p.id = c."parentId" WHERE l.status = 'ACTIVE' GROUP BY p.name ORDER BY n DESC`,
    ]);
    const daily = await this.prisma.$queryRaw<{ d: Date; listings: bigint; users: bigint }[]>`
      SELECT d::date AS d,
        (SELECT COUNT(*) FROM "Listing" WHERE "createdAt"::date = d::date)::bigint AS listings,
        (SELECT COUNT(*) FROM "User" WHERE "createdAt"::date = d::date)::bigint AS users
      FROM generate_series(${month}::date, now()::date, '1 day') d ORDER BY d`;
    return {
      users, users7, listings, active, listings24, listings7, pending, reports, messages7, revenue30: 0,
      byCategory: byCat.map((c) => ({ name: c.name, count: Number(c.n) })),
      daily: daily.map((d) => ({ date: d.d.toISOString().slice(0, 10), listings: Number(d.listings), users: Number(d.users) })),
      searchEngine: this.search.usingMeili ? 'Meilisearch' : 'PostgreSQL (záložní)',
    };
  }

  @Roles('MODERATOR')
  @Get('listings')
  async listings(@Query('status') status = 'PENDING', @Query('q') q?: string) {
    const rows = await this.prisma.listing.findMany({
      where: { ...(status !== 'ALL' ? { status: status as any } : {}), ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { id: q }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {}) },
      include: { ...LISTING_INCLUDE, user: { select: { id: true, name: true, email: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true } } },
      orderBy: [{ spamScore: 'desc' }, { createdAt: 'desc' }], take: 100,
    });
    return rows.map((l) => ({ ...this.search.toCard(l), spamScore: l.spamScore, userEmail: l.user.email, userName: l.user.name, userId: l.userId, description: l.description.slice(0, 400), rejectReason: l.rejectReason }));
  }

  @Roles('MODERATOR')
  @Post('listings/:id/moderate')
  async moderate(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ action: z.enum(['approve', 'reject', 'delete']), reason: z.string().max(500).optional() }))) dto: { action: 'approve' | 'reject' | 'delete'; reason?: string }) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    const status = dto.action === 'approve' ? 'ACTIVE' : dto.action === 'reject' ? 'REJECTED' : 'DELETED';
    await this.prisma.listing.update({ where: { id }, data: { status, rejectReason: dto.action === 'approve' ? null : dto.reason, publishedAt: status === 'ACTIVE' ? (l.publishedAt ?? new Date()) : l.publishedAt } });
    await this.prisma.notification.create({ data: { userId: l.userId, type: 'moderation', title: dto.action === 'approve' ? `Inzerát „${l.title}“ byl schválen` : `Inzerát „${l.title}“ byl zamítnut`, body: dto.reason, link: '/muj-ucet/inzeraty' } });
    await this.audit(u, `listing.${dto.action}`, 'listing', id, { reason: dto.reason });
    await this.search.index(id);
    return { ok: true };
  }

  @Roles('MODERATOR')
  @Get('reports')
  async reports(@Query('status') status = 'OPEN') {
    const rows = await this.prisma.report.findMany({ where: { status: status as any }, include: { reporter: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const listingIds = rows.filter((r) => r.targetType === 'LISTING').map((r) => r.targetId);
    const userIds = rows.filter((r) => r.targetType === 'USER').map((r) => r.targetId);
    const [ls, us] = await Promise.all([
      this.prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true, slug: true, status: true } }),
      this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, status: true } }),
    ]);
    return rows.map((r) => ({ ...r, listing: ls.find((l) => l.id === r.targetId), user: us.find((x) => x.id === r.targetId) }));
  }

  @Roles('MODERATOR')
  @Post('reports/:id/resolve')
  async resolve(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ status: z.enum(['RESOLVED', 'DISMISSED']) }))) dto: { status: 'RESOLVED' | 'DISMISSED' }) {
    await this.prisma.report.update({ where: { id }, data: { status: dto.status, resolvedById: u.id, resolvedAt: new Date() } });
    await this.audit(u, `report.${dto.status.toLowerCase()}`, 'report', id);
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get('users')
  async users(@Query('q') q?: string) {
    return this.prisma.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { id: q }] } : {},
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, lastSeenAt: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, _count: { select: { listings: true, reports: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  @Roles('ADMIN')
  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(), status: z.enum(['ACTIVE', 'BLOCKED']).optional() }))) dto: { role?: 'USER' | 'MODERATOR' | 'ADMIN'; status?: 'ACTIVE' | 'BLOCKED' }) {
    await this.prisma.user.update({ where: { id }, data: dto });
    if (dto.status === 'BLOCKED') {
      await this.auth.revokeAll(id);
      const ls = await this.prisma.listing.findMany({ where: { userId: id, status: 'ACTIVE' }, select: { id: true } });
      await this.prisma.listing.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'REJECTED', rejectReason: 'Účet zablokován' } });
      await Promise.all(ls.map((l) => this.search.index(l.id)));
    } else await this.auth.flushUser(id);
    await this.audit(u, 'user.update', 'user', id, dto);
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get('categories')
  categories() { return this.prisma.category.findMany({ orderBy: [{ parentId: 'asc' }, { position: 'asc' }] }); }

  @Roles('ADMIN')
  @Put('categories/:id')
  async saveCategory(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ name: z.string().min(2).max(80), active: z.boolean(), position: z.number().int(), seoTitle: z.string().max(120).nullable().optional(), seoDescription: z.string().max(300).nullable().optional(), filters: z.array(z.any()).optional() }))) dto: any) {
    await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit(u, 'category.update', 'category', id, dto);
    return { ok: true };
  }

  @Roles('ADMIN')
  @Post('categories')
  async createCategory(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ name: z.string().min(2).max(80), slug: z.string().regex(/^[a-z0-9-]+$/), parentId: z.string().nullable() }))) dto: { name: string; slug: string; parentId: string | null }) {
    const c = await this.prisma.category.create({ data: { ...dto, position: 999 } });
    await this.audit(u, 'category.create', 'category', c.id, dto);
    return c;
  }

  @Roles('ADMIN')
  @Get('prices')
  prices() { return this.prisma.priceItem.findMany({ orderBy: { priceCzk: 'asc' } }); }

  @Roles('ADMIN')
  @Put('prices/:code')
  async savePrice(@Param('code') code: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ name: z.string().min(2), description: z.string().nullable().optional(), priceCzk: z.number().int().min(0), durationDays: z.number().int().min(0).nullable().optional(), active: z.boolean() }))) dto: any) {
    await this.prisma.priceItem.upsert({ where: { code }, create: { code, ...dto }, update: dto });
    await this.audit(u, 'price.update', 'price', code, dto);
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get('pages')
  pages() { return this.prisma.page.findMany({ orderBy: { slug: 'asc' } }); }

  @Roles('ADMIN')
  @Put('pages/:slug')
  async savePage(@Param('slug') slug: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ title: z.string().min(2), content: z.string() }))) dto: { title: string; content: string }) {
    await this.prisma.page.upsert({ where: { slug }, create: { slug, ...dto }, update: dto });
    await this.audit(u, 'page.update', 'page', slug);
    return { ok: true };
  }

  @Roles('ADMIN')
  @Get('audit')
  auditLog() { return this.prisma.auditLog.findMany({ include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }); }

  @Roles('ADMIN')
  @Post('reindex')
  async reindex(@CurrentUser() u: AuthUser) {
    const n = await this.search.reindexAll();
    await this.audit(u, 'search.reindex', 'search', 'listings', { n });
    return { indexed: n };
  }
}
