import Link from 'next/link';
import { BadgeCheck, MapPin, Zap } from 'lucide-react';
import { ago, CONDITION_LABEL, listingUrl, price } from '@/lib/format';
import type { ListingCard as L } from '@/lib/types';
import { FavoriteButton } from './favorite-button';

export function ListingCard({ l, priority, favorite }: { l: L; priority?: boolean; favorite?: boolean }) {
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface border transition-shadow hover:shadow-card ${l.highlighted ? 'border-brand' : 'border-line'}`}>
      <Link href={listingUrl(l)} className="absolute inset-0 z-10" aria-label={l.title} />
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {l.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image} alt="" loading={priority ? 'eager' : 'lazy'} decoding="async" className="size-full object-cover" />
        ) : <div className="size-full grid place-items-center text-muted text-sm">Bez fotky</div>}
        <div className="absolute left-2 top-2 flex gap-1">
          {l.isTop && <span className="badge bg-surface text-ink shadow-card"><Zap className="size-3 text-brand" />Top</span>}
          {l.status === 'RESERVED' && <span className="badge bg-ink text-paper">Rezervováno</span>}
          {l.status === 'SOLD' && <span className="badge bg-ink text-paper">Prodáno</span>}
        </div>
        <FavoriteButton id={l.id} initial={favorite} className="absolute right-2 top-2 z-20" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-[16px] font-bold tracking-tight">{price(l.price, l.priceNegotiable, l.currency)}</div>
        <h3 className="line-clamp-2 text-[14.5px] leading-snug text-ink-2">{l.title}</h3>
        <div className="mt-auto flex items-center gap-1.5 pt-2 text-[12.5px] text-muted">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{l.city}{l.distanceKm != null ? ` · ${l.distanceKm} km` : ''}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{ago(l.createdAt)}</span>
        </div>
        {(l.verified || l.condition) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            {l.condition && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-2">{CONDITION_LABEL[l.condition]}</span>}
            {l.verified && <span className="inline-flex items-center gap-1 text-trust font-medium"><BadgeCheck className="size-3.5" />Ověřený</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export function ListingGrid({ items, favorites }: { items: L[]; favorites?: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((l, i) => <ListingCard key={l.id} l={l} priority={i < 4} favorite={favorites?.has(l.id)} />)}
    </div>
  );
}
