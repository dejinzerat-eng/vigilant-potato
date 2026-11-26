import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CATEGORIES, CITIES, findCity, SearchParams } from '@dej/shared';
import { config } from '../common/config';
import { PrismaService } from '../common/prisma.service';

export const LISTING_INCLUDE = {
  images: { orderBy: { position: 'asc' as const }, take: 1 },
  category: { include: { parent: true } },
  user: { select: { id: true, name: true, phoneVerifiedAt: true, emailVerifiedAt: true, isBusiness: true, companyName: true } },
} satisfies Prisma.ListingInclude;
type ListingWith = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

const ATTR_KEYS = [...new Set(CATEGORIES.flatMap((c) => [...c.filters, ...c.children.flatMap((s) => s.filters ?? [])].map((f) => f.key)))];
const PAGE = 24;

export interface ListingCard {
  id: string; slug: string; title: string; price: number | null; priceNegotiable: boolean; currency: string;
  city: string; region: string; condition: string | null; offerType: string; image: string | null; createdAt: number;
  categorySlug: string; parentCategorySlug: string; categoryName: string; verified: boolean; isTop: boolean; highlighted: boolean;
  status: string; distanceKm?: number;
}

/**
 * Vyhledávání přes Meilisearch (překlepy, našeptávání, geo filtr, fasety).
 * Když Meilisearch není dostupný, použije se záložní hledání v PostgreSQL.
 */
@Injectable()
export class SearchService implements OnModuleInit {
  private log = new Logger('Search');
  private enabled = false;

  constructor(private prisma: PrismaService) {}

  private async meili(path: string, method = 'GET', body?: unknown) {
    const r = await fetch(`${config.meiliUrl}${path}`, {
      method, headers: { Authorization: `Bearer ${config.meiliKey}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Meilisearch ${method} ${path}: ${r.status} ${await r.text()}`);
    return r.json() as Promise<any>;
  }

  async onModuleInit() {
    if (!config.meiliUrl) { this.log.log('Meilisearch není nastaven – hledá se v PostgreSQL.'); return; }
    try {
      await this.meili('/health');
      await this.meili('/indexes', 'POST', { uid: 'listings', primaryKey: 'id' }).catch(() => undefined);
      await this.meili('/indexes/listings/settings', 'PATCH', {
        searchableAttributes: ['title', 'categoryName', 'attrText', 'description'],
        filterableAttributes: ['categorySlug', 'parentCategorySlug', 'price', 'city', 'region', 'condition', 'offerType', 'verified', 'createdAt', '_geo', 'status', 'userId', ...ATTR_KEYS.map((k) => `attr_${k}`)],
        sortableAttributes: ['price', 'createdAt', 'rankAt', '_geo'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness', 'rankAt:desc'],
        typoTolerance: { enabled: true, minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } },
        synonyms: {
          iphone: ['ajfoun', 'ifon'], notebook: ['laptop', 'ntb'], laptop: ['notebook'], kolo: ['bicykl', 'jízdní kolo'], bicykl: ['kolo'],
          auto: ['automobil', 'vůz'], televize: ['tv', 'televizor'], tv: ['televize'], mobil: ['telefon', 'smartphone'], telefon: ['mobil'],
          gauč: ['pohovka', 'sedačka'], pohovka: ['gauč', 'sedačka'], sedačka: ['gauč', 'pohovka'], ps5: ['playstation 5'], playstation: ['ps4', 'ps5'],
        },
        pagination: { maxTotalHits: 5000 },
      });
      this.enabled = true;
      this.log.log('Meilisearch připojen');
      const stats = await this.meili('/indexes/listings/stats').catch(() => ({ numberOfDocuments: 0 }));
      if (!stats.numberOfDocuments) setTimeout(() => this.reindexAll().then((n) => this.log.log(`Index naplněn: ${n}`)).catch(() => undefined), 1000);
    } catch (e) {
      this.log.warn(`Meilisearch není dostupný – použije se hledání v PostgreSQL. (${(e as Error).message})`);
    }
  }

  get usingMeili() { return this.enabled; }

  toCard(l: ListingWith, now = Date.now()): ListingCard {
    const parent = l.category.parent ?? l.category;
    return {
      id: l.id, slug: l.slug, title: l.title, price: l.price, priceNegotiable: l.priceNegotiable, currency: l.currency,
      city: l.city, region: l.region, condition: l.condition, offerType: l.offerType, image: l.images[0]?.thumbUrl ?? null,
      createdAt: (l.publishedAt ?? l.createdAt).getTime(), categorySlug: l.category.slug, parentCategorySlug: parent.slug, categoryName: l.category.name,
      verified: !!l.user.phoneVerifiedAt, isTop: !!l.topUntil && l.topUntil.getTime() > now, highlighted: !!l.highlightedUntil && l.highlightedUntil.getTime() > now,
      status: l.status,
    };
  }

  private toDoc(l: ListingWith) {
    const card = this.toCard(l);
    const attrs = (l.attributes ?? {}) as Record<string, unknown>;
    const doc: Record<string, unknown> = {
      ...card, description: l.description.slice(0, 2000), userId: l.userId,
      rankAt: Math.max((l.bumpedAt ?? l.publishedAt ?? l.createdAt).getTime(), card.isTop ? Date.now() + 1e12 : 0),
      attrText: Object.values(attrs).filter((v) => typeof v === 'string').join(' '),
    };
    for (const [k, v] of Object.entries(attrs)) doc[`attr_${k}`] = v;
    if (l.lat != null && l.lng != null) doc._geo = { lat: l.lat, lng: l.lng };
    return doc;
  }

  async index(listingId: string) {
    if (!this.enabled) return;
    const l = await this.prisma.listing.findUnique({ where: { id: listingId }, include: LISTING_INCLUDE });
    try {
      if (!l || !['ACTIVE', 'RESERVED'].includes(l.status)) await this.meili(`/indexes/listings/documents/${listingId}`, 'DELETE');
      else await this.meili('/indexes/listings/documents', 'POST', [this.toDoc(l)]);
    } catch (e) { this.log.error((e as Error).message); }
  }

  async reindexAll() {
    if (!this.enabled) return 0;
    await this.meili('/indexes/listings/documents', 'DELETE');
    let cursor: string | undefined; let n = 0;
    for (;;) {
      const batch = await this.prisma.listing.findMany({ where: { status: { in: ['ACTIVE', 'RESERVED'] } }, include: LISTING_INCLUDE, take: 500, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: 'asc' } });
      if (!batch.length) break;
      await this.meili('/indexes/listings/documents', 'POST', batch.map((l) => this.toDoc(l)));
      n += batch.length; cursor = batch[batch.length - 1].id;
    }
    return n;
  }

  private geoOf(p: SearchParams) {
    if (!p.city) return undefined;
    const c = findCity(p.city);
    return c ? { lat: c.lat, lng: c.lng } : undefined;
  }

  async search(p: SearchParams, opts: { createdAfter?: Date; limit?: number } = {}) {
    const page = Math.max(1, p.page ?? 1);
    const limit = opts.limit ?? PAGE;
    if (this.enabled) {
      try { return await this.searchMeili(p, page, limit, opts.createdAfter); } catch (e) { this.log.error((e as Error).message); }
    }
    return this.searchDb(p, page, limit, opts.createdAfter);
  }

  private async searchMeili(p: SearchParams, page: number, limit: number, createdAfter?: Date) {
    const f: string[] = [];
    const esc = (s: string) => JSON.stringify(s);
    if (p.sub) f.push(`categorySlug = ${esc(p.sub)}`);
    else if (p.category) f.push(`parentCategorySlug = ${esc(p.category)}`);
    if (p.priceMin != null) f.push(`price >= ${Number(p.priceMin)}`);
    if (p.priceMax != null) f.push(`price <= ${Number(p.priceMax)}`);
    const geo = this.geoOf(p);
    if (geo && p.radius) f.push(`_geoRadius(${geo.lat}, ${geo.lng}, ${Math.min(500, Number(p.radius)) * 1000})`);
    else if (p.city) f.push(`city = ${esc(p.city)}`);
    if (p.region) f.push(`region = ${esc(p.region)}`);
    if (p.condition?.length) f.push(`condition IN [${p.condition.map(esc).join(',')}]`);
    if (p.offerType) f.push(`offerType = ${esc(p.offerType)}`);
    if (p.verified) f.push('verified = true');
    const since = createdAfter?.getTime() ?? (p.since ? Date.now() - { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 }[p.since] : undefined);
    if (since) f.push(`createdAt > ${since}`);
    for (const [k, v] of Object.entries(p.attrs ?? {})) {
      if (!ATTR_KEYS.includes(k)) continue;
      const a = `attr_${k}`;
      if (Array.isArray(v)) f.push(`${a} IN [${v.map(esc).join(',')}]`);
      else if (typeof v === 'boolean') f.push(`${a} = true`);
      else if (typeof v === 'object' && v) { if (v.min != null) f.push(`${a} >= ${Number(v.min)}`); if (v.max != null) f.push(`${a} <= ${Number(v.max)}`); }
      else if (typeof v === 'string') f.push(`${a} = ${esc(v)}`);
    }
    const sort: string[] = [];
    if (p.sort === 'newest') sort.push('createdAt:desc');
    else if (p.sort === 'price_asc') sort.push('price:asc');
    else if (p.sort === 'price_desc') sort.push('price:desc');
    else if (p.sort === 'distance' && geo) sort.push(`_geoPoint(${geo.lat}, ${geo.lng}):asc`);
    else if (!p.q) sort.push('rankAt:desc');
    const r = await this.meili('/indexes/listings/search', 'POST', {
      q: p.q ?? '', filter: f, sort, hitsPerPage: limit, page,
      facets: ['parentCategorySlug', 'categorySlug', 'condition'],
      attributesToRetrieve: ['id', 'slug', 'title', 'price', 'priceNegotiable', 'currency', 'city', 'region', 'condition', 'offerType', 'image', 'createdAt', 'categorySlug', 'parentCategorySlug', 'categoryName', 'verified', 'isTop', 'highlighted', 'status', '_geo'],
    });
    const hits = (r.hits as (ListingCard & { _geo?: { lat: number; lng: number }; _geoDistance?: number })[]).map(({ _geo, _geoDistance, ...h }) => ({
      ...h, ...(geo && _geo ? { distanceKm: Math.round(haversine(geo, _geo)) } : {}),
    }));
    return { hits, total: r.totalHits as number, page, pages: r.totalPages as number, facets: r.facetDistribution as Record<string, Record<string, number>>, engine: 'meilisearch' };
  }

  private async searchDb(p: SearchParams, page: number, limit: number, createdAfter?: Date) {
    const where: Prisma.ListingWhereInput = { status: { in: ['ACTIVE', 'RESERVED'] } };
    const and: Prisma.ListingWhereInput[] = [];
    if (p.q) for (const w of p.q.split(/\s+/).filter(Boolean)) and.push({ OR: [{ title: { contains: w, mode: 'insensitive' } }, { description: { contains: w, mode: 'insensitive' } }] });
    if (p.sub) and.push({ category: { slug: p.sub, parent: p.category ? { slug: p.category } : undefined } });
    else if (p.category) and.push({ OR: [{ category: { slug: p.category, parentId: null } }, { category: { parent: { slug: p.category } } }] });
    if (p.priceMin != null || p.priceMax != null) and.push({ price: { gte: p.priceMin, lte: p.priceMax } });
    const geo = this.geoOf(p);
    if (geo && p.radius) {
      const d = p.radius / 111;
      and.push({ lat: { gte: geo.lat - d, lte: geo.lat + d }, lng: { gte: geo.lng - d * 1.5, lte: geo.lng + d * 1.5 } });
    } else if (p.city) and.push({ city: p.city });
    if (p.region) and.push({ region: p.region });
    if (p.condition?.length) and.push({ condition: { in: p.condition as any } });
    if (p.offerType) and.push({ offerType: p.offerType as any });
    if (p.verified) and.push({ user: { phoneVerifiedAt: { not: null } } });
    const since = createdAfter ?? (p.since ? new Date(Date.now() - { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 }[p.since]) : undefined);
    if (since) and.push({ createdAt: { gt: since } });
    for (const [k, v] of Object.entries(p.attrs ?? {})) {
      if (!ATTR_KEYS.includes(k)) continue;
      if (Array.isArray(v)) and.push({ OR: v.map((x) => ({ attributes: { path: [k], equals: x } })) });
      else if (typeof v === 'object' && v) { if (v.min != null) and.push({ attributes: { path: [k], gte: v.min } }); if (v.max != null) and.push({ attributes: { path: [k], lte: v.max } }); }
      else and.push({ attributes: { path: [k], equals: v as any } });
    }
    where.AND = and;
    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      p.sort === 'price_asc' ? [{ price: 'asc' }] : p.sort === 'price_desc' ? [{ price: 'desc' }] : p.sort === 'newest' ? [{ createdAt: 'desc' }] : [{ topUntil: { sort: 'desc', nulls: 'last' } }, { bumpedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({ where, include: LISTING_INCLUDE, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.listing.count({ where }),
    ]);
    const hits = rows.map((l) => ({ ...this.toCard(l), ...(geo && l.lat != null && l.lng != null ? { distanceKm: Math.round(haversine(geo, { lat: l.lat, lng: l.lng })) } : {}) }));
    return { hits, total, page, pages: Math.ceil(total / limit), facets: {}, engine: 'postgres' };
  }

  /** Našeptávač: názvy inzerátů + kategorie + města. */
  async suggest(q: string) {
    const nq = q.trim();
    if (nq.length < 2) return { queries: [], categories: [], cities: [] };
    const low = nq.toLowerCase();
    const categories = CATEGORIES.flatMap((c) => [{ slug: c.slug, name: c.name, parent: null as string | null, parentName: null as string | null }, ...c.children.map((s) => ({ slug: s.slug, name: s.name, parent: c.slug, parentName: c.name }))])
      .filter((c) => c.name.toLowerCase().includes(low)).slice(0, 4);
    const cities = CITIES.filter((c) => c.name.toLowerCase().startsWith(low)).slice(0, 3).map((c) => c.name);
    let titles: string[] = [];
    if (this.enabled) {
      try {
        const r = await this.meili('/indexes/listings/search', 'POST', { q: nq, limit: 8, attributesToRetrieve: ['title'], filter: [] });
        titles = r.hits.map((h: { title: string }) => h.title);
      } catch { /* ignore */ }
    } else {
      titles = (await this.prisma.listing.findMany({ where: { status: 'ACTIVE', title: { contains: nq, mode: 'insensitive' } }, select: { title: true }, take: 8 })).map((x) => x.title);
    }
    const queries = [...new Set(titles.map((t) => t.length > 48 ? t.slice(0, 48).replace(/\s\S*$/, '') : t))].slice(0, 6);
    return { queries, categories, cities };
  }
}

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
