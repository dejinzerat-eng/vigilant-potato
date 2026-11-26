import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { filtersFor, findCity, slugify } from '@dej/shared';
import { z } from 'zod';
import { AuthUser } from '../common/auth.guard';
import { config } from '../common/config';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { LISTING_INCLUDE, SearchService } from '../search/search.service';
import { assessListing } from './moderation';

export const ListingDto = z.object({
  title: z.string().trim().min(5, 'Název musí mít alespoň 5 znaků.').max(90, 'Název může mít nejvýše 90 znaků.'),
  description: z.string().trim().min(20, 'Popis musí mít alespoň 20 znaků.').max(8000),
  price: z.number().int().min(0).max(2_000_000_000).nullable().optional(),
  priceNegotiable: z.boolean().default(false),
  currency: z.enum(['CZK', 'EUR']).default('CZK'),
  categorySlug: z.string().min(1, 'Vyberte kategorii.'),
  subSlug: z.string().min(1, 'Vyberte podkategorii.'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'DAMAGED']).nullable().optional(),
  offerType: z.enum(['SELL', 'BUY', 'EXCHANGE', 'GIVE', 'RENT']).default('SELL'),
  city: z.string().trim().min(2, 'Zadejte lokalitu.').max(80),
  zip: z.string().regex(/^\d{3}\s?\d{2}$/, 'PSČ má 5 číslic.').optional().or(z.literal('')),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
  imageIds: z.array(z.string()).max(20, 'Nejvýše 20 fotografií.').default([]),
  videoUrl: z.string().url().regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//, 'Video vložte jako odkaz na YouTube nebo Vimeo.').optional().or(z.literal('')),
  publish: z.boolean().default(true),
});
export type ListingInput = z.infer<typeof ListingDto>;

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService, private search: SearchService, private redis: RedisService) {}

  private async resolveCategory(categorySlug: string, subSlug: string) {
    const cat = await this.prisma.category.findFirst({ where: { slug: subSlug, parent: { slug: categorySlug } }, include: { parent: true } });
    if (!cat) throw new BadRequestException('Neplatná kategorie.');
    return cat;
  }

  private cleanAttributes(categorySlug: string, subSlug: string, attrs: ListingInput['attributes']) {
    const defs = filtersFor(categorySlug, subSlug);
    const out: Record<string, unknown> = {};
    for (const d of defs) {
      const v = attrs[d.key];
      if (v === undefined || v === '' || v === null) continue;
      if (d.type === 'range') { const n = Number(v); if (Number.isFinite(n)) out[d.key] = n; }
      else if (d.type === 'boolean') { if (v === true || v === 'true') out[d.key] = true; }
      else if (d.type === 'multiselect') { const arr = (Array.isArray(v) ? v : [String(v)]).filter((x) => d.options?.includes(x)); if (arr.length) out[d.key] = arr.length === 1 ? arr[0] : arr; }
      else if (d.options?.includes(String(v))) out[d.key] = String(v);
    }
    return out;
  }

  private async checkSpam(userId: string) {
    const n = await this.redis.incr(`newlisting:${userId}`, 3600);
    if (n > 20) throw new BadRequestException('Za hodinu lze vložit nejvýše 20 inzerátů.');
  }

  async create(user: AuthUser, dto: ListingInput) {
    await this.checkSpam(user.id);
    const cat = await this.resolveCategory(dto.categorySlug, dto.subSlug);
    const city = findCity(dto.city);
    const risk = assessListing({ title: dto.title, description: dto.description, price: dto.price, categorySlug: dto.categorySlug });
    const status: ListingStatus = !dto.publish ? 'DRAFT' : risk.score >= 50 || config.premoderation ? 'PENDING' : 'ACTIVE';
    const listing = await this.prisma.listing.create({
      data: {
        slug: slugify(dto.title), title: dto.title, description: dto.description, price: dto.price ?? null, priceNegotiable: dto.priceNegotiable,
        currency: dto.currency, categoryId: cat.id, userId: user.id, condition: dto.condition ?? null, offerType: dto.offerType,
        city: city?.name ?? dto.city, region: city?.region ?? '', zip: dto.zip?.replace(/\s/g, '') || city?.zip, lat: city?.lat, lng: city?.lng,
        attributes: this.cleanAttributes(dto.categorySlug, dto.subSlug, dto.attributes) as Prisma.InputJsonValue,
        videoUrl: dto.videoUrl || null, status, spamScore: risk.score,
        publishedAt: status === 'ACTIVE' ? new Date() : null,
        expiresAt: new Date(Date.now() + config.listingDays * 864e5),
      },
    });
    await this.attachImages(listing.id, user.id, dto.imageIds);
    await this.search.index(listing.id);
    return { id: listing.id, slug: listing.slug, status, moderation: risk.reasons };
  }

  private async attachImages(listingId: string, userId: string, ids: string[]) {
    await this.prisma.listingImage.updateMany({ where: { listingId, id: { notIn: ids } }, data: { listingId: null } });
    await Promise.all(ids.map((id, position) => this.prisma.listingImage.updateMany({ where: { id, ownerId: userId }, data: { listingId, position } })));
  }

  async ownOrThrow(id: string, user: AuthUser) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l || l.status === 'DELETED') throw new NotFoundException('Inzerát neexistuje.');
    if (l.userId !== user.id && user.role === 'USER') throw new ForbiddenException('Tento inzerát vám nepatří.');
    return l;
  }

  async update(id: string, user: AuthUser, dto: ListingInput) {
    const l = await this.ownOrThrow(id, user);
    const cat = await this.resolveCategory(dto.categorySlug, dto.subSlug);
    const city = findCity(dto.city);
    const risk = assessListing({ title: dto.title, description: dto.description, price: dto.price, categorySlug: dto.categorySlug });
    let status = l.status;
    if (l.status === 'DRAFT' && dto.publish) status = risk.score >= 50 || config.premoderation ? 'PENDING' : 'ACTIVE';
    else if (risk.score >= 50 && l.status === 'ACTIVE') status = 'PENDING';
    await this.prisma.listing.update({
      where: { id },
      data: {
        slug: slugify(dto.title), title: dto.title, description: dto.description, price: dto.price ?? null, priceNegotiable: dto.priceNegotiable, currency: dto.currency,
        categoryId: cat.id, condition: dto.condition ?? null, offerType: dto.offerType,
        city: city?.name ?? dto.city, region: city?.region ?? l.region, zip: dto.zip?.replace(/\s/g, '') || city?.zip, lat: city?.lat ?? l.lat, lng: city?.lng ?? l.lng,
        attributes: this.cleanAttributes(dto.categorySlug, dto.subSlug, dto.attributes) as Prisma.InputJsonValue,
        videoUrl: dto.videoUrl || null, status, spamScore: risk.score, publishedAt: status === 'ACTIVE' && !l.publishedAt ? new Date() : l.publishedAt,
      },
    });
    await this.attachImages(id, l.userId, dto.imageIds);
    await this.search.index(id);
    return { id, status };
  }

  async setStatus(id: string, user: AuthUser, status: 'ACTIVE' | 'RESERVED' | 'SOLD') {
    const l = await this.ownOrThrow(id, user);
    if (!['ACTIVE', 'RESERVED', 'SOLD'].includes(l.status)) throw new BadRequestException('Stav tohoto inzerátu nelze změnit.');
    await this.prisma.listing.update({ where: { id }, data: { status } });
    await this.search.index(id);
    return { ok: true };
  }

  async renew(id: string, user: AuthUser) {
    const l = await this.ownOrThrow(id, user);
    if (!['ACTIVE', 'EXPIRED', 'RESERVED'].includes(l.status)) throw new BadRequestException('Tento inzerát nelze prodloužit.');
    await this.prisma.listing.update({ where: { id }, data: { status: l.status === 'EXPIRED' ? 'ACTIVE' : l.status, expiresAt: new Date(Date.now() + config.listingDays * 864e5), expiryNotifiedAt: null } });
    await this.search.index(id);
    return { ok: true };
  }

  async remove(id: string, user: AuthUser) {
    await this.ownOrThrow(id, user);
    await this.prisma.listing.update({ where: { id }, data: { status: 'DELETED' } });
    await this.search.index(id);
    return { ok: true };
  }

  async detail(id: string, viewer?: AuthUser, ip?: string) {
    const l = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } }, category: { include: { parent: true } },
        user: { select: { id: true, name: true, avatarUrl: true, city: true, createdAt: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true, lastSeenAt: true, phone: true } },
      },
    });
    const isOwner = viewer && (viewer.id === l?.userId || viewer.role !== 'USER');
    if (!l || l.status === 'DELETED' || (!isOwner && ['DRAFT', 'PENDING', 'REJECTED'].includes(l.status))) throw new NotFoundException('Inzerát neexistuje nebo byl odstraněn.');
    if (!isOwner && (await this.redis.lock(`view:${id}:${viewer?.id ?? ip}`, 3600))) {
      await this.prisma.listing.update({ where: { id }, data: { views: { increment: 1 } } });
    }
    const [rating, activeCount, favCount, isFavorite] = await Promise.all([
      this.prisma.review.aggregate({ where: { sellerId: l.userId }, _avg: { rating: true }, _count: true }),
      this.prisma.listing.count({ where: { userId: l.userId, status: 'ACTIVE' } }),
      this.prisma.favorite.count({ where: { listingId: id } }),
      viewer ? this.prisma.favorite.findUnique({ where: { userId_listingId: { userId: viewer.id, listingId: id } } }).then(Boolean) : false,
    ]);
    const { phone, ...seller } = l.user;
    return {
      ...l, user: undefined,
      seller: { ...seller, phoneVerified: !!l.user.phoneVerifiedAt, emailVerified: !!l.user.emailVerifiedAt, phoneVerifiedAt: undefined, emailVerifiedAt: undefined, rating: rating._avg.rating, reviewCount: rating._count, activeListings: activeCount, hasPhone: !!phone },
      favorites: favCount, isFavorite, isOwner: !!isOwner, filters: filtersFor(l.category.parent?.slug ?? l.category.slug, l.category.slug),
    };
  }

  async revealPhone(id: string, viewer: AuthUser) {
    const l = await this.prisma.listing.findUnique({ where: { id }, include: { user: { select: { phone: true, phoneVerifiedAt: true } } } });
    if (!l?.user.phone) throw new NotFoundException('Prodejce telefon nezveřejnil.');
    if ((await this.redis.incr(`phone:${viewer.id}`, 86400)) > 50) throw new BadRequestException('Denní limit zobrazení telefonu vyčerpán.');
    return { phone: l.user.phone };
  }

  async similar(id: string) {
    const l = await this.prisma.listing.findUnique({ where: { id }, include: { category: { include: { parent: true } } } });
    if (!l) return [];
    const words = l.title.split(/\s+/).filter((w) => w.length > 2).slice(0, 3).join(' ');
    let r = await this.search.search({ q: words, category: l.category.parent?.slug, sub: l.category.slug }, { limit: 9 });
    if (r.hits.length < 4) r = await this.search.search({ category: l.category.parent?.slug, sub: l.category.slug }, { limit: 9 });
    return r.hits.filter((h) => h.id !== id).slice(0, 8);
  }

  /** Doporučená cena: medián cen podobných aktivních inzerátů ve stejné podkategorii. */
  async priceSuggestion(title: string, categorySlug?: string, subSlug?: string) {
    const r = await this.search.search({ q: title.split(/\s+/).slice(0, 4).join(' '), category: categorySlug, sub: subSlug }, { limit: 60 });
    const prices = r.hits.map((h) => h.price).filter((p): p is number => p != null && p > 0).sort((a, b) => a - b);
    if (prices.length < 3) return { sample: prices.length, median: null };
    const q = (f: number) => prices[Math.min(prices.length - 1, Math.floor(f * prices.length))];
    const round = (n: number) => (n > 10000 ? Math.round(n / 500) * 500 : n > 1000 ? Math.round(n / 50) * 50 : Math.round(n / 10) * 10);
    return { sample: prices.length, median: round(q(0.5)), low: round(q(0.25)), high: round(q(0.75)) };
  }

  /** Návrh kategorie z názvu: nejčastější podkategorie mezi nejrelevantnějšími výsledky. */
  async suggestCategory(title: string) {
    const r = await this.search.search({ q: title }, { limit: 30 });
    const counts = new Map<string, { parent: string; sub: string; name: string; n: number }>();
    r.hits.forEach((h, i) => {
      const k = `${h.parentCategorySlug}/${h.categorySlug}`;
      const cur = counts.get(k) ?? { parent: h.parentCategorySlug, sub: h.categorySlug, name: h.categoryName, n: 0 };
      cur.n += 30 - i; counts.set(k, cur);
    });
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 3).map(({ n, ...c }) => c);
  }

  async mine(userId: string, status?: string) {
    const where: Prisma.ListingWhereInput = { userId, status: status ? (status as ListingStatus) : { not: 'DELETED' } };
    const rows = await this.prisma.listing.findMany({ where, include: { ...LISTING_INCLUDE, _count: { select: { favorites: true, conversations: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map((l) => ({ ...this.search.toCard(l), views: l.views, favorites: l._count.favorites, conversations: l._count.conversations, expiresAt: l.expiresAt, rejectReason: l.rejectReason }));
  }

  async forEdit(id: string, user: AuthUser) {
    await this.ownOrThrow(id, user);
    return this.prisma.listing.findUnique({ where: { id }, include: { images: { orderBy: { position: 'asc' } }, category: { include: { parent: true } } } });
  }
}
