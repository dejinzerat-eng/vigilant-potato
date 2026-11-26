'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { call } from '@/lib/client';
import { ago, listingUrl, price, STATUS_LABEL } from '@/lib/format';
import { useToast } from '../toast';

interface Row { id: string; slug: string; title: string; price: number | null; priceNegotiable: boolean; image: string | null; status: string; spamScore: number; userEmail: string; userName: string; userId: string; description: string; createdAt: number; city: string; categoryName: string; rejectReason: string | null }

export function ModerationList({ rows }: { rows: Row[] }) {
  const router = useRouter(); const sp = useSearchParams()!; const toast = useToast();
  async function act(id: string, action: string) {
    const reason = action !== 'approve' ? prompt('Důvod (uvidí ho autor):') ?? undefined : undefined;
    if (action !== 'approve' && reason === undefined) return;
    try { await call(`/admin/listings/${id}/moderate`, 'POST', { action, reason }); toast('Hotovo'); router.refresh(); } catch (e) { toast((e as Error).message, 'error'); }
  }
  const status = sp.get('status') ?? 'PENDING';
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {['PENDING', 'ACTIVE', 'REJECTED', 'ALL'].map((s) => <Link key={s} href={`?status=${s}`} className={`chip ${status === s ? 'chip-active' : ''}`}>{s === 'ALL' ? 'Vše' : STATUS_LABEL[s]}</Link>)}
        <form className="ml-auto"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.get('q') ?? ''} placeholder="Hledat název, ID, e-mail…" className="input h-8 w-56 text-sm" /></form>
      </div>
      {!rows.length ? <div className="card p-10 text-center text-muted">Nic k zobrazení.</div> : (
        <ul className="space-y-3">{rows.map((r) => (
          <li key={r.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.image ? <img src={r.image} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" /> : <div className="h-24 w-32 shrink-0 rounded-xl bg-surface-2" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="badge bg-surface-2">{STATUS_LABEL[r.status]}</span>
                {r.spamScore > 0 && <span className={`badge ${r.spamScore >= 50 ? 'bg-danger-soft text-danger' : 'bg-top-soft'}`}>Riziko {r.spamScore}</span>}
                <span className="text-muted">{r.categoryName} · {r.city} · {ago(r.createdAt)}</span>
              </div>
              <Link href={listingUrl(r)} target="_blank" className="mt-1 block font-semibold hover:underline">{r.title} – {price(r.price, r.priceNegotiable)}</Link>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
              <p className="mt-1 text-xs text-muted">{r.userName} · {r.userEmail}</p>
              {r.rejectReason && <p className="mt-1 text-xs text-danger">Důvod: {r.rejectReason}</p>}
            </div>
            <div className="flex shrink-0 gap-2 sm:flex-col">
              {r.status !== 'ACTIVE' && <button onClick={() => act(r.id, 'approve')} className="btn btn-sm bg-trust text-white">Schválit</button>}
              {r.status !== 'REJECTED' && <button onClick={() => act(r.id, 'reject')} className="btn btn-outline btn-sm">Zamítnout</button>}
              <button onClick={() => act(r.id, 'delete')} className="btn btn-danger btn-sm">Smazat</button>
            </div>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
