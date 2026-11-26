import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, Building2, Check, MapPin, Star, X } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { FollowButton } from '@/components/follow-button';
import { ListingGrid } from '@/components/listing-card';
import { ReportButton } from '@/components/report-button';
import { api } from '@/lib/api';
import { ago, plural } from '@/lib/format';
import type { ListingCard } from '@/lib/types';

interface Profile { id: string; name: string; avatarUrl: string | null; bio: string | null; city: string | null; createdAt: string; lastSeenAt: string | null; phoneVerified: boolean; emailVerified: boolean; isBusiness: boolean; companyName: string | null; companyId: string | null; rating: number | null; reviewCount: number; ratingDistribution: Record<string, number>; reviews: { id: string; rating: number; text: string | null; createdAt: string; author: { name: string } }[]; soldCount: number; followers: number; isFollowing: boolean; trust: number; trustBreakdown: { label: string; ok: boolean }[]; listings: ListingCard[] }
type Props = { params: Promise<{ id: string }> };
const load = (id: string) => api<Profile>(`/users/${id}`).catch(() => notFound());

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).id);
  return { title: `${p.companyName ?? p.name} – inzeráty a hodnocení`, description: `${p.listings.length} aktivních inzerátů, hodnocení ${p.rating?.toFixed(1) ?? '–'} z 5.` };
}

export default async function Page({ params }: Props) {
  const p = await load((await params).id);
  const name = p.companyName ?? p.name;
  return (
    <div className="container-x py-8">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <Avatar name={name} url={p.avatarUrl} size={72} />
              <div className="min-w-0">
                <h1 className="h-display flex items-center gap-1.5 text-2xl font-bold"><span className="truncate">{name}</span>{p.phoneVerified && <BadgeCheck className="size-5 shrink-0 text-trust" aria-label="Ověřený" />}</h1>
                <div className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">{p.isBusiness && <span className="inline-flex items-center gap-1"><Building2 className="size-4" />Firma</span>}{p.city && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{p.city}</span>}</div>
              </div>
            </div>
            {p.bio && <p className="mt-4 text-[15px] text-ink-2">{p.bio}</p>}
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-2 p-2.5"><dt className="text-xs text-muted">Hodnocení</dt><dd className="font-bold">{p.rating ? `${p.rating.toFixed(1)} ★` : '–'}</dd></div>
              <div className="rounded-xl bg-surface-2 p-2.5"><dt className="text-xs text-muted">Prodáno</dt><dd className="font-bold">{p.soldCount}</dd></div>
              <div className="rounded-xl bg-surface-2 p-2.5"><dt className="text-xs text-muted">Sledující</dt><dd className="font-bold">{p.followers}</dd></div>
            </dl>
            <div className="mt-5 flex items-center justify-between gap-2"><FollowButton id={p.id} initial={p.isFollowing} /><ReportButton targetType="USER" targetId={p.id} label="Nahlásit" /></div>
            {p.lastSeenAt && <p className="mt-3 text-xs text-muted">Naposledy aktivní {ago(p.lastSeenAt)}</p>}
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between"><h2 className="font-bold">Skóre důvěryhodnosti</h2><span className="text-2xl font-bold text-trust">{p.trust}<span className="text-sm font-medium text-muted">/100</span></span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-trust" style={{ width: `${p.trust}%` }} /></div>
            <ul className="mt-4 space-y-2 text-sm">{p.trustBreakdown.map((t) => <li key={t.label} className="flex items-center gap-2">{t.ok ? <Check className="size-4 text-trust" /> : <X className="size-4 text-muted" />}<span className={t.ok ? '' : 'text-muted'}>{t.label}</span></li>)}</ul>
            <p className="mt-4 text-xs text-muted">Skóre počítáme jen z ověřitelných údajů. Hodnotit může pouze ten, kdo s prodejcem skutečně komunikoval.</p>
          </div>
        </aside>
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="h-display mb-4 text-2xl font-bold">{plural(p.listings.length, 'aktivní inzerát', 'aktivní inzeráty', 'aktivních inzerátů')}</h2>
            {p.listings.length ? <ListingGrid items={p.listings} /> : <p className="text-muted">Žádné aktivní inzeráty.</p>}
          </section>
          <section>
            <h2 className="h-display mb-4 text-2xl font-bold">Hodnocení ({p.reviewCount})</h2>
            {p.reviews.length ? (
              <ul className="space-y-3">{p.reviews.map((r) => (
                <li key={r.id} className="card p-4"><div className="flex items-center justify-between"><span className="font-semibold">{r.author.name}</span><span className="text-xs text-muted">{ago(r.createdAt)}</span></div>
                  <div className="mt-1 flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${n <= r.rating ? 'fill-top text-top' : 'text-line'}`} />)}</div>
                  {r.text && <p className="mt-2 text-[15px] text-ink-2">{r.text}</p>}</li>
              ))}</ul>
            ) : <p className="text-muted">Zatím bez hodnocení.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
