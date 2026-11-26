import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CITIES, findCity } from '@dej/shared';
import { z } from 'zod';
import { Auth, AuthUser, CurrentUser } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod';
import { AuthService } from '../auth/auth.service';
import { LISTING_INCLUDE, SearchService } from '../search/search.service';

const ProfileDto = z.object({
  name: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(600).optional(),
  city: z.string().trim().max(80).optional(),
  isBusiness: z.boolean().optional(),
  companyName: z.string().trim().max(120).optional(),
  companyId: z.string().regex(/^\d{8}$/, 'IČO má 8 číslic.').optional().or(z.literal('')),
  avatarUrl: z.string().max(500).optional(),
});

const SavedSearchDto = z.object({ name: z.string().trim().min(1).max(120), query: z.record(z.string(), z.unknown()), notify: z.boolean().default(true) });

@Controller()
export class UsersController {
  constructor(private prisma: PrismaService, private search: SearchService, private auth: AuthService) {}

  @Get('cities')
  cities() { return CITIES.map((c) => ({ name: c.name, region: c.region, zip: c.zip })); }

  @Auth('optional')
  @Get('users/:id')
  async profile(@Param('id') id: string, @CurrentUser() viewer?: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, avatarUrl: true, bio: true, city: true, createdAt: true, lastSeenAt: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true, companyId: true, status: true } });
    if (!u || u.status !== 'ACTIVE') throw new NotFoundException('Uživatel neexistuje.');
    const [listings, rating, dist, reviews, sold, followers, following] = await Promise.all([
      this.prisma.listing.findMany({ where: { userId: id, status: { in: ['ACTIVE', 'RESERVED'] } }, include: LISTING_INCLUDE, orderBy: { createdAt: 'desc' }, take: 60 }),
      this.prisma.review.aggregate({ where: { sellerId: id }, _avg: { rating: true }, _count: true }),
      this.prisma.review.groupBy({ by: ['rating'], where: { sellerId: id }, _count: true }),
      this.prisma.review.findMany({ where: { sellerId: id }, include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.listing.count({ where: { userId: id, status: 'SOLD' } }),
      this.prisma.followSeller.count({ where: { sellerId: id } }),
      viewer ? this.prisma.followSeller.findUnique({ where: { followerId_sellerId: { followerId: viewer.id, sellerId: id } } }).then(Boolean) : false,
    ]);
    // Transparentní skóre důvěryhodnosti 0–100 z ověřitelných signálů
    const ageDays = (Date.now() - u.createdAt.getTime()) / 864e5;
    const trust = Math.round(
      (u.emailVerifiedAt ? 15 : 0) + (u.phoneVerifiedAt ? 25 : 0) + Math.min(20, ageDays / 18) +
      Math.min(20, rating._count * 4) * ((rating._avg.rating ?? 0) / 5) + Math.min(10, sold * 2) + (u.companyId ? 10 : 0));
    const { status, ...pub } = u;
    return {
      ...pub, phoneVerified: !!u.phoneVerifiedAt, emailVerified: !!u.emailVerifiedAt, phoneVerifiedAt: undefined, emailVerifiedAt: undefined,
      rating: rating._avg.rating, reviewCount: rating._count, ratingDistribution: Object.fromEntries(dist.map((d) => [d.rating, d._count])),
      reviews, soldCount: sold, followers, isFollowing: following, trust: Math.min(100, trust),
      trustBreakdown: [
        { label: 'Ověřený e-mail', ok: !!u.emailVerifiedAt }, { label: 'Ověřený telefon', ok: !!u.phoneVerifiedAt },
        { label: `Na portálu ${ageDays < 30 ? 'méně než měsíc' : ageDays < 365 ? `${Math.floor(ageDays / 30)} měs.` : `${Math.floor(ageDays / 365)} r.`}`, ok: ageDays > 90 },
        { label: `${rating._count} hodnocení po skutečné komunikaci`, ok: rating._count > 0 }, { label: `${sold} prodaných inzerátů`, ok: sold > 0 },
        ...(u.isBusiness ? [{ label: u.companyId ? `Firma s IČO ${u.companyId}` : 'Firma bez IČO', ok: !!u.companyId }] : []),
      ],
      listings: listings.map((l) => this.search.toCard(l)),
    };
  }

  @Auth()
  @Patch('me')
  async updateMe(@CurrentUser() u: AuthUser, @Body(new ZodPipe(ProfileDto)) dto: z.infer<typeof ProfileDto>) {
    const city = dto.city ? findCity(dto.city) : undefined;
    await this.prisma.user.update({ where: { id: u.id }, data: { ...dto, companyId: dto.companyId || null, city: city?.name ?? dto.city, region: city?.region } });
    await this.auth.flushUser(u.id);
    return { ok: true };
  }

  /** GDPR: export všech osobních údajů */
  @Auth()
  @Get('me/export')
  async exportData(@CurrentUser() u: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: u.id },
      select: { id: true, email: true, name: true, phone: true, bio: true, city: true, createdAt: true, listings: true, favorites: true, savedSearches: true, messages: true, reviewsGiven: true, following: true },
    });
  }

  /** GDPR: smazání účtu – anonymizace osobních údajů a odstranění inzerátů */
  @Auth()
  @Delete('me')
  async deleteMe(@CurrentUser() u: AuthUser) {
    await this.prisma.$transaction([
      this.prisma.listing.updateMany({ where: { userId: u.id }, data: { status: 'DELETED' } }),
      this.prisma.user.update({ where: { id: u.id }, data: { email: `deleted-${u.id}@dejinzerat.invalid`, name: 'Smazaný uživatel', phone: null, bio: null, avatarUrl: null, passwordHash: null, googleId: null, appleId: null, status: 'BLOCKED' } }),
    ]);
    await this.auth.revokeAll(u.id);
    return { ok: true };
  }

  @Auth()
  @Post('users/:id/follow')
  async follow(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    if (id !== u.id) await this.prisma.followSeller.upsert({ where: { followerId_sellerId: { followerId: u.id, sellerId: id } }, create: { followerId: u.id, sellerId: id }, update: {} });
    return { ok: true };
  }

  @Auth()
  @Delete('users/:id/follow')
  async unfollow(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    await this.prisma.followSeller.deleteMany({ where: { followerId: u.id, sellerId: id } });
    return { ok: true };
  }

  @Auth()
  @Get('me/following')
  async following(@CurrentUser() u: AuthUser) {
    const f = await this.prisma.followSeller.findMany({ where: { followerId: u.id }, include: { seller: { select: { id: true, name: true, avatarUrl: true, city: true, phoneVerifiedAt: true, _count: { select: { listings: { where: { status: 'ACTIVE' } } } } } } } });
    return f.map((x) => ({ ...x.seller, activeListings: x.seller._count.listings, _count: undefined }));
  }

  @Auth()
  @Get('me/saved-searches')
  saved(@CurrentUser() u: AuthUser) { return this.prisma.savedSearch.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } }); }

  @Auth()
  @Post('me/saved-searches')
  async save(@CurrentUser() u: AuthUser, @Body(new ZodPipe(SavedSearchDto)) dto: z.infer<typeof SavedSearchDto>) {
    const n = await this.prisma.savedSearch.count({ where: { userId: u.id } });
    if (n >= 50) return { error: 'Nejvýše 50 uložených hledání.' };
    return this.prisma.savedSearch.create({ data: { userId: u.id, name: dto.name, query: dto.query as Prisma.InputJsonValue, notify: dto.notify } });
  }

  @Auth()
  @Patch('me/saved-searches/:id')
  async toggleSaved(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ notify: z.boolean() }))) dto: { notify: boolean }) {
    await this.prisma.savedSearch.updateMany({ where: { id, userId: u.id }, data: { notify: dto.notify } });
    return { ok: true };
  }

  @Auth()
  @Delete('me/saved-searches/:id')
  async deleteSaved(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    await this.prisma.savedSearch.deleteMany({ where: { id, userId: u.id } });
    return { ok: true };
  }

  @Auth()
  @Get('me/notifications')
  notifications(@CurrentUser() u: AuthUser) { return this.prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' }, take: 50 }); }

  @Auth()
  @Post('me/notifications/read')
  async readAll(@CurrentUser() u: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  @Auth()
  @Get('me/blocked')
  async blockedList(@CurrentUser() u: AuthUser) {
    const b = await this.prisma.block.findMany({ where: { blockerId: u.id }, include: { blocked: { select: { id: true, name: true } } } });
    return b.map((x) => x.blocked);
  }

  @Get('pages/:slug')
  async page(@Param('slug') slug: string) {
    const p = await this.prisma.page.findUnique({ where: { slug } });
    if (!p) throw new NotFoundException();
    return p;
  }

  @Get('prices')
  prices() { return this.prisma.priceItem.findMany({ where: { active: true }, orderBy: { priceCzk: 'asc' } }); }
}
