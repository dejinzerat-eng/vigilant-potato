import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { BadgeCheck, Building2, CalendarDays, Eye, Heart, MapPin, Pencil, Star } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { CompareBar, CompareToggle } from '@/components/compare';
import { ContactBox } from '@/components/contact-box';
import { FavoriteButton } from '@/components/favorite-button';
import { Gallery } from '@/components/gallery';
import { ListingGrid } from '@/components/listing-card';
import { ReportButton } from '@/components/report-button';
import { ShareButton } from '@/components/share-button';
import { api, ApiError, getMe } from '@/lib/api';
import { ago, CONDITION_LABEL, OFFER_LABEL, plural, price, STATUS_LABEL } from '@/lib/format';
import type { FilterDef, ListingCard } from '@/lib/types';

interface Detail {
  id: string; slug: string; title: string; description: string; price: number | null; priceNegotiable: boolean; currency: string;
  condition: string | null; offerType: string; status: string; city: string; region: string; zip: string | null; attributes: Record<string, unknown>;
  videoUrl: string | null; views: number; publishedAt: string | null; createdAt: string; expiresAt: string;
  images: { url: string; thumbUrl: string }[]; category: { slug: string; name: string; parent: { slug: string; name: string } | null };
  seller: { id: string; name: string; avatarUrl: string | null; city: string | null; createdAt: string; phoneVerified: boolean; emailVerified: boolean; isBusiness: boolean; companyName: string | null; lastSeenAt: string | null; rating: number | null; reviewCount: number; activeListings: number; hasPhone: boolean };
  favorites: number; isFavorite: boolean; isOwner: boolean; filters: FilterDef[];
}
type Props = { params: Promise<{ id: string; slug: string }> };

async function load(id: string) {
  try { return await api<Detail>(`/listings/${id}`); } catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = await load(id);
  const desc = `${price(l.price, l.priceNegotiable, l.currency)} · ${l.city} · ${l.description.slice(0, 140).replace(/\s+/g, ' ')}`;
  return {
    title: `${l.title} – ${price(l.price, l.priceNegotiable, l.currency)}, ${l.city}`, description: desc,
    alternates: { canonical: `/inzerat/${l.id}/${l.slug}` },
    openGraph: { title: l.title, description: desc, images: l.images[0] ? [{ url: l.images[0].url }] : undefined, type: 'article' },
    robots: ['ACTIVE', 'RESERVED'].includes(l.status) ? undefined : { index: false },
  };
}

function videoEmbed(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
}

export default async function Page({ params }: Props) {
  const { id, slug } = await params;
  const [l, me] = await Promise.all([load(id), getMe()]);
  if (slug !== l.slug) permanentRedirect(`/inzerat/${l.id}/${l.slug}`);
  const similar = await api<ListingCard[]>(`/listings/${id}/similar`, { auth: false }).catch(() => []);
  const parent = l.category.parent ?? l.category;
  const params2 = l.filters.map((f) => ({ f, v: l.attributes[f.key] })).filter((x) => x.v !== undefined && x.v !== '');
  const fmt = (f: FilterDef, v: unknown) => f.type === 'boolean' ? 'Ano' : f.type === 'range' ? `${new Intl.NumberFormat('cs-CZ').format(Number(v))}${f.unit ? ` ${f.unit}` : ''}` : Array.isArray(v) ? v.join(', ') : String(v);
  const embed = l.videoUrl ? videoEmbed(l.videoUrl) : null;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: l.title, description: l.description.slice(0, 500), image: l.images.map((i) => i.url), category: `${parent.name} > ${l.category.name}`,
    ...(l.price != null ? { offers: { '@type': 'Offer', price: l.price, priceCurrency: l.currency, availability: l.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', itemCondition: l.condition === 'NEW' ? 'https://schema.org/NewCondition' : l.condition === 'DAMAGED' ? 'https://schema.org/DamagedCondition' : 'https://schema.org/UsedCondition', areaServed: l.city } } : {}),
  };

  return (
    <div className="container-x py-4 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Drobečková navigace">
        <Link href="/" className="hover:text-ink">Domů</Link><span>/</span>
        <Link href={`/kategorie/${parent.slug}`} className="hover:text-ink">{parent.name}</Link><span>/</span>
        <Link href={`/kategorie/${parent.slug}/${l.category.slug}`} className="hover:text-ink">{l.category.name}</Link>
      </nav>

      {l.isOwner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 pl-4">
          <span className="text-sm">Toto je váš inzerát · stav: <b>{STATUS_LABEL[l.status]}</b> · {plural(l.views, 'zobrazení', 'zobrazení', 'zobrazení')} · {plural(l.favorites, 'uložení', 'uložení', 'uložení')}</span>
          <div className="flex gap-2"><Link href={`/inzerat/${l.id}/upravit`} className="btn btn-dark btn-sm"><Pencil className="size-4" />Upravit</Link><Link href="/muj-ucet/inzeraty" className="btn btn-outline btn-sm">Moje inzeráty</Link></div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <Gallery images={l.images} title={l.title} />

          <div className="mt-6 lg:hidden"><Summary l={l} /></div>

          {params2.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">Parametry</h2>
              <dl className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-2">
                {l.condition && <Row k="Stav" v={CONDITION_LABEL[l.condition]} />}
                <Row k="Typ nabídky" v={OFFER_LABEL[l.offerType]} />
                {params2.map(({ f, v }) => <Row key={f.key} k={f.label} v={fmt(f, v)} />)}
              </dl>
            </section>
          )}

          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold">Popis</h2>
            <div className="whitespace-pre-line text-[16px] leading-relaxed text-ink-2">{l.description}</div>
          </section>

          {embed && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">Video</h2>
              <iframe src={embed} title="Video k inzerátu" className="aspect-video w-full rounded-2xl" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />Vloženo {ago(l.publishedAt ?? l.createdAt)}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="size-4" />{plural(l.views, 'zobrazení', 'zobrazení', 'zobrazení')}</span>
            <span className="inline-flex items-center gap-1.5"><Heart className="size-4" />{plural(l.favorites, 'uložení', 'uložení', 'uložení')}</span>
            <span>ID {l.id.slice(-8)}</span>
            {!l.isOwner && <span className="ml-auto"><ReportButton targetType="LISTING" targetId={l.id} label="Nahlásit inzerát" /></span>}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block"><Summary l={l} /></div>
          {!l.isOwner && ['ACTIVE', 'RESERVED'].includes(l.status) && (
            <div className="card p-5" id="kontakt">
              <h2 className="mb-3 font-bold">Napsat prodejci</h2>
              <ContactBox listingId={l.id} loggedIn={!!me} hasPhone={l.seller.hasPhone} sellerName={l.seller.name} />
            </div>
          )}
          <Link href={`/uzivatel/${l.seller.id}`} className="card flex items-center gap-4 p-5 transition hover:shadow-pop">
            <Avatar name={l.seller.name} url={l.seller.avatarUrl} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="truncate">{l.seller.companyName ?? l.seller.name}</span>
                {l.seller.phoneVerified && <BadgeCheck className="size-[18px] shrink-0 text-trust" aria-label="Ověřený prodejce" />}
                {l.seller.isBusiness && <Building2 className="size-4 shrink-0 text-muted" aria-label="Firma" />}
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                {l.seller.reviewCount > 0 ? <><Star className="size-4 fill-top text-top" /><b className="text-ink">{l.seller.rating?.toFixed(1)}</b> ({l.seller.reviewCount})</> : 'Zatím bez hodnocení'}
                <span>·</span>{plural(l.seller.activeListings, 'inzerát', 'inzeráty', 'inzerátů')}
              </div>
              <div className="text-sm text-muted">Registrace: {new Date(l.seller.createdAt).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</div>
            </div>
          </Link>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="h-display mb-5 text-2xl font-bold">Podobné nabídky</h2>
          <ListingGrid items={similar.slice(0, 8)} />
        </section>
      )}
      <CompareBar />
    </div>
  );
}

function Summary({ l }: { l: Detail }) {
  return (
    <div className="card p-5">
      {l.status !== 'ACTIVE' && <div className="badge mb-2 bg-ink text-paper">{STATUS_LABEL[l.status]}</div>}
      <h1 className="h-display text-2xl font-bold leading-tight sm:text-[28px]">{l.title}</h1>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{price(l.price, l.priceNegotiable, l.currency)}</span>
        {l.priceNegotiable && l.price != null && <span className="text-sm text-muted">· k jednání</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-2"><MapPin className="size-4 text-muted" />{l.city}{l.zip ? `, ${l.zip.replace(/(\d{3})(\d{2})/, '$1 $2')}` : ''}</span>
        {l.condition && <span className="rounded-md bg-surface-2 px-2 py-0.5">{CONDITION_LABEL[l.condition]}</span>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 [&_.btn]:h-10 [&_.btn]:px-2 [&_.btn]:text-sm">
        <FavoriteButton id={l.id} initial={l.isFavorite} large />
        <CompareToggle id={l.id} />
        <ShareButton title={l.title} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 border-b border-line px-4 py-3 text-[15px] sm:odd:border-r"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;
}
