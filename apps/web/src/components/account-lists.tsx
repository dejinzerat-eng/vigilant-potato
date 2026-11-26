'use client';
import Link from 'next/link';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toSearchString, type SearchParams } from '@dej/shared';
import { call } from '@/lib/client';
import { ago } from '@/lib/format';
import { Avatar } from './avatar';
import { useToast } from './toast';

export function SavedSearches({ items }: { items: { id: string; name: string; query: SearchParams; notify: boolean; createdAt: string }[] }) {
  const router = useRouter(); const toast = useToast();
  const act = async (p: Promise<unknown>, m: string) => { try { await p; toast(m); router.refresh(); } catch (e) { toast((e as Error).message, 'error'); } };
  if (!items.length) return <div className="card p-12 text-center text-muted">Ve výsledcích hledání klikněte na „Hlídat nové inzeráty“ a my vám dáme vědět o každé nové nabídce.</div>;
  return (
    <ul className="space-y-3">
      {items.map((s) => (
        <li key={s.id} className="card flex items-center gap-4 p-4">
          <Link href={`/hledat?${toSearchString(s.query)}`} className="min-w-0 flex-1">
            <div className="truncate font-semibold hover:underline">{s.name}</div>
            <div className="text-sm text-muted">Uloženo {ago(s.createdAt)} · {s.notify ? 'upozornění zapnuta' : 'upozornění vypnuta'}</div>
          </Link>
          <button onClick={() => act(call(`/me/saved-searches/${s.id}`, 'PATCH', { notify: !s.notify }), s.notify ? 'Upozornění vypnuta' : 'Upozornění zapnuta')} className="btn btn-ghost btn-sm" aria-label={s.notify ? 'Vypnout upozornění' : 'Zapnout upozornění'}>{s.notify ? <Bell className="size-4 text-brand" /> : <BellOff className="size-4" />}</button>
          <button onClick={() => act(call(`/me/saved-searches/${s.id}`, 'DELETE'), 'Hledání smazáno')} className="btn btn-ghost btn-sm text-danger" aria-label="Smazat"><Trash2 className="size-4" /></button>
        </li>
      ))}
    </ul>
  );
}

export function Following({ items }: { items: { id: string; name: string; avatarUrl: string | null; city: string | null; activeListings: number }[] }) {
  const router = useRouter();
  if (!items.length) return <div className="card p-12 text-center text-muted">Na profilu prodejce klikněte na „Sledovat“ a jeho nové nabídky uvidíte tady.</div>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((u) => (
        <li key={u.id} className="card flex items-center gap-3 p-4">
          <Avatar name={u.name} url={u.avatarUrl} size={44} />
          <Link href={`/uzivatel/${u.id}`} className="min-w-0 flex-1"><div className="truncate font-semibold hover:underline">{u.name}</div><div className="text-sm text-muted">{u.city ?? ''} · {u.activeListings} inzerátů</div></Link>
          <button onClick={async () => { await call(`/users/${u.id}/follow`, 'DELETE'); router.refresh(); }} className="btn btn-outline btn-sm">Nesledovat</button>
        </li>
      ))}
    </ul>
  );
}

export function MarkRead() {
  const router = useRouter();
  return <button onClick={async () => { await call('/me/notifications/read', 'POST'); router.refresh(); }} className="btn btn-outline btn-sm">Označit vše jako přečtené</button>;
}
