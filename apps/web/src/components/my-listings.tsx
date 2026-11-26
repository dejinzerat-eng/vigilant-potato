'use client';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';
import { listingUrl, price, STATUS_LABEL } from '@/lib/format';
import type { ListingCard } from '@/lib/types';
import { useToast } from './toast';

type Mine = ListingCard & { views: number; favorites: number; conversations: number; expiresAt: string | null; rejectReason: string | null };
const TABS = [['', 'Vše'], ['ACTIVE', 'Aktivní'], ['RESERVED', 'Rezervované'], ['SOLD', 'Prodané'], ['DRAFT', 'Koncepty'], ['PENDING', 'Ke schválení'], ['EXPIRED', 'Vypršelé']] as const;
const TONE: Record<string, string> = { ACTIVE: 'bg-trust-soft text-trust', RESERVED: 'bg-top-soft text-ink', SOLD: 'bg-surface-2 text-ink-2', DRAFT: 'bg-surface-2 text-ink-2', PENDING: 'bg-top-soft text-ink', EXPIRED: 'bg-danger-soft text-danger', REJECTED: 'bg-danger-soft text-danger' };

export function MyListings({ items }: { items: Mine[] }) {
  const [tab, setTab] = useState('');
  const router = useRouter(); const toast = useToast();
  const shown = items.filter((i) => !tab || i.status === tab);
  async function act(id: string, path: string, method = 'POST', body?: unknown, msg = 'Hotovo') {
    try { await call(path, method, body); toast(msg); router.refresh(); } catch (e) { toast((e as Error).message, 'error'); }
  }
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-display text-3xl font-bold">Moje inzeráty</h1>
        <Link href="/pridat" className="btn btn-primary btn-sm"><Plus className="size-4" />Přidat inzerát</Link>
      </div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto scrollbar-none">
        {TABS.map(([v, l]) => { const n = items.filter((i) => !v || i.status === v).length; return (n > 0 || !v) && <button key={v} onClick={() => setTab(v)} className={`chip shrink-0 ${tab === v ? 'chip-active' : ''}`}>{l} <span className="opacity-60">{n}</span></button>; })}
      </div>
      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center"><p className="text-muted">Zatím tu nic není.</p><Link href="/pridat" className="btn btn-primary">Vložit první inzerát</Link></div>
      ) : (
        <ul className="space-y-3">
          {shown.map((l) => {
            const days = l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 864e5) : null;
            return (
              <li key={l.id} className="card flex gap-4 p-3 sm:p-4">
                <Link href={listingUrl(l)} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.image ? <img src={l.image} alt="" className="h-20 w-24 rounded-xl object-cover sm:h-24 sm:w-32" /> : <div className="h-20 w-24 rounded-xl bg-surface-2 sm:h-24 sm:w-32" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${TONE[l.status] ?? ''}`}>{STATUS_LABEL[l.status]}</span>
                    {days != null && ['ACTIVE', 'RESERVED'].includes(l.status) && <span className={`text-xs ${days <= 3 ? 'font-semibold text-danger' : 'text-muted'}`}>{days > 0 ? `končí za ${days} d.` : 'končí dnes'}</span>}
                  </div>
                  <Link href={listingUrl(l)} className="mt-1 block truncate font-semibold hover:underline">{l.title}</Link>
                  <div className="text-[15px] font-bold">{price(l.price, l.priceNegotiable, l.currency)}</div>
                  {l.rejectReason && <p className="mt-1 text-sm text-danger">Důvod: {l.rejectReason}</p>}
                  <div className="mt-1.5 flex gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1"><Eye className="size-4" />{l.views}</span>
                    <span className="inline-flex items-center gap-1"><Heart className="size-4" />{l.favorites}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="size-4" />{l.conversations}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Link href={`/inzerat/${l.id}/upravit`} className="btn btn-outline btn-sm"><Pencil className="size-4" /><span className="hidden sm:inline">Upravit</span></Link>
                  <details className="relative">
                    <summary className="btn btn-ghost btn-sm list-none" aria-label="Další akce"><MoreHorizontal className="size-4" /></summary>
                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
                      {['ACTIVE', 'RESERVED', 'EXPIRED'].includes(l.status) && <Item onClick={() => act(l.id, `/listings/${l.id}/renew`, 'POST', undefined, 'Inzerát prodloužen o 30 dní')} icon={RefreshCw}>Prodloužit o 30 dní</Item>}
                      {l.status === 'ACTIVE' && <Item onClick={() => act(l.id, `/listings/${l.id}/status`, 'POST', { status: 'RESERVED' }, 'Označeno jako rezervované')}>Označit jako rezervované</Item>}
                      {['ACTIVE', 'RESERVED'].includes(l.status) && <Item onClick={() => act(l.id, `/listings/${l.id}/status`, 'POST', { status: 'SOLD' }, 'Gratulujeme k prodeji!')}>Označit jako prodané</Item>}
                      {['RESERVED', 'SOLD'].includes(l.status) && <Item onClick={() => act(l.id, `/listings/${l.id}/status`, 'POST', { status: 'ACTIVE' }, 'Inzerát je znovu aktivní')}>Znovu aktivovat</Item>}
                      <Item danger icon={Trash2} onClick={() => confirm('Opravdu smazat tento inzerát?') && act(l.id, `/listings/${l.id}`, 'DELETE', undefined, 'Inzerát smazán')}>Smazat</Item>
                    </div>
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Item({ children, onClick, icon: I, danger }: { children: React.ReactNode; onClick: () => void; icon?: React.ComponentType<{ className?: string }>; danger?: boolean }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-surface-2 ${danger ? 'text-danger' : ''}`}>{I && <I className="size-4" />}{children}</button>;
}
