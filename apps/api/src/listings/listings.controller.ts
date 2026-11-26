import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { fromSearchString, parseNaturalQuery } from '@dej/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { Auth, AuthUser, CurrentUser } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';
import { ZodPipe } from '../common/zod';
import { SearchService } from '../search/search.service';
import { ListingDto, ListingInput, ListingsService } from './listings.service';

@Controller()
export class ListingsController {
  constructor(private listings: ListingsService, private search: SearchService, private prisma: PrismaService) {}

  @Get('categories')
  async categories() {
    const all = await this.prisma.category.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
    const counts = await this.prisma.listing.groupBy({ by: ['categoryId'], where: { status: 'ACTIVE' }, _count: true });
    const cnt = new Map(counts.map((c) => [c.categoryId, c._count]));
    return all.filter((c) => !c.parentId).map((c) => {
      const children = all.filter((s) => s.parentId === c.id).map((s) => ({ id: s.id, slug: s.slug, name: s.name, filters: s.filters, count: cnt.get(s.id) ?? 0, seoTitle: s.seoTitle, seoDescription: s.seoDescription }));
      return { id: c.id, slug: c.slug, name: c.name, icon: c.icon, filters: c.filters, seoTitle: c.seoTitle, seoDescription: c.seoDescription, count: children.reduce((a, s) => a + s.count, 0), children };
    });
  }

  /** Vyhledávání. Parametr `chytre=1` zapne rozpoznání přirozeného jazyka v `q`. */
  @Get('search')
  async doSearch(@Query() query: Record<string, string>) {
    let params = fromSearchString(query);
    let recognized: string[] = [];
    if (query.chytre === '1' && params.q) {
      const parsed = parseNaturalQuery(params.q);
      recognized = parsed.recognized;
      params = { ...parsed.params, ...Object.fromEntries(Object.entries(params).filter(([k, v]) => k !== 'q' && v !== undefined)), q: parsed.params.q };
      // Rozpoznané město hledáme i v okolí (30 km)
      if (parsed.params.city && params.radius === undefined) { params.radius = 30; recognized = recognized.map((r) => (r === parsed.params.city ? `${r} + 30 km` : r)); }
    }
    const r = await this.search.search(params);
    return { ...r, params, recognized };
  }

  @Get('search/suggest')
  suggest(@Query('q') q = '') { return this.search.suggest(q); }

  /** Doporučené: topované a zvýrazněné nabídky, doplněné o nabídky ověřených prodejců. */
  @Get('listings/featured')
  async featured(@Query('limit') limit = '8') {
    const n = Math.min(24, Number(limit) || 8);
    const hits = (await this.search.search({}, { limit: 48 })).hits;
    const paid = hits.filter((h) => h.isTop || h.highlighted);
    const rest = hits.filter((h) => !(h.isTop || h.highlighted) && h.verified && h.image);
    return [...paid, ...rest].slice(0, n);
  }

  @Get('listings/latest')
  async latest(@Query('limit') limit = '12') {
    return (await this.search.search({ sort: 'newest' }, { limit: Math.min(48, Number(limit) || 12) })).hits;
  }

  @Auth()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('listings')
  create(@CurrentUser() u: AuthUser, @Body(new ZodPipe(ListingDto)) dto: ListingInput) { return this.listings.create(u, dto); }

  @Auth()
  @Get('listings/suggest-category')
  suggestCategory(@Query('title') title = '') { return this.listings.suggestCategory(title); }

  @Get('listings/price-suggestion')
  price(@Query('title') title = '', @Query('kategorie') cat?: string, @Query('pod') sub?: string) { return this.listings.priceSuggestion(title, cat, sub); }

  @Auth('optional')
  @Get('listings/:id')
  detail(@Param('id') id: string, @CurrentUser() u: AuthUser | undefined, @Req() req: Request) { return this.listings.detail(id, u, req.ip); }

  @Get('listings/:id/similar')
  similar(@Param('id') id: string) { return this.listings.similar(id); }

  @Auth()
  @Get('listings/:id/edit')
  forEdit(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.listings.forEdit(id, u); }

  @Auth()
  @Get('listings/:id/phone')
  phone(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.listings.revealPhone(id, u); }

  @Auth()
  @Patch('listings/:id')
  update(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(ListingDto)) dto: ListingInput) { return this.listings.update(id, u, dto); }

  @Auth()
  @Post('listings/:id/status')
  status(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ status: z.enum(['ACTIVE', 'RESERVED', 'SOLD']) }))) dto: { status: 'ACTIVE' | 'RESERVED' | 'SOLD' }) {
    return this.listings.setStatus(id, u, dto.status);
  }

  @Auth()
  @Post('listings/:id/renew')
  renew(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.listings.renew(id, u); }

  @Auth()
  @Delete('listings/:id')
  remove(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.listings.remove(id, u); }

  @Auth()
  @Post('listings/:id/favorite')
  async fav(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    await this.prisma.favorite.upsert({ where: { userId_listingId: { userId: u.id, listingId: id } }, create: { userId: u.id, listingId: id }, update: {} });
    return { ok: true };
  }

  @Auth()
  @Delete('listings/:id/favorite')
  async unfav(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    await this.prisma.favorite.deleteMany({ where: { userId: u.id, listingId: id } });
    return { ok: true };
  }

  @Auth()
  @Get('me/listings')
  mine(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.listings.mine(u.id, status); }

  @Auth()
  @Get('me/favorites')
  async favorites(@CurrentUser() u: AuthUser) {
    const favs = await this.prisma.favorite.findMany({ where: { userId: u.id, listing: { status: { not: 'DELETED' } } }, include: { listing: { include: { images: { orderBy: { position: 'asc' }, take: 1 }, category: { include: { parent: true } }, user: { select: { id: true, name: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true } } } } }, orderBy: { createdAt: 'desc' } });
    return favs.map((f) => this.search.toCard(f.listing));
  }

  /** Porovnání více inzerátů (max 4) */
  @Get('compare')
  async compare(@Query('ids') ids = '') {
    const list = ids.split(',').filter(Boolean).slice(0, 4);
    const rows = await this.prisma.listing.findMany({ where: { id: { in: list }, status: { in: ['ACTIVE', 'RESERVED', 'SOLD'] } }, include: { images: { orderBy: { position: 'asc' }, take: 1 }, category: { include: { parent: true } }, user: { select: { id: true, name: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true } } } });
    return rows.map((l) => ({ ...this.search.toCard(l), attributes: l.attributes, publishedAt: l.publishedAt }));
  }

  @Auth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reports')
  async report(@CurrentUser() u: AuthUser, @Body(new ZodPipe(z.object({ targetType: z.enum(['LISTING', 'USER', 'MESSAGE']), targetId: z.string(), reason: z.string().min(2).max(80), note: z.string().max(1000).optional() }))) dto: { targetType: 'LISTING' | 'USER' | 'MESSAGE'; targetId: string; reason: string; note?: string }) {
    await this.prisma.report.create({ data: { ...dto, reporterId: u.id } });
    return { ok: true };
  }
}
