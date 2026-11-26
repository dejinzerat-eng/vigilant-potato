import Link from 'next/link';
import { MarkRead } from '@/components/account-lists';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
export const metadata = { title: 'Upozornění', robots: { index: false } };
interface N { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string; type: string }
export default async function Page() {
  const items = await api<N[]>('/me/notifications');
  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3"><h1 className="h-display text-3xl font-bold">Upozornění</h1>{items.some((i) => !i.readAt) && <MarkRead />}</div>
      {!items.length ? <div className="card p-12 text-center text-muted">Zatím žádná upozornění.</div> : (
        <ul className="card divide-y divide-line overflow-hidden">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={n.link ?? '#'} className={`flex gap-3 p-4 hover:bg-surface-2 ${n.readAt ? '' : 'bg-brand-soft/30'}`}>
                <span className={`mt-2 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand'}`} />
                <div className="min-w-0"><div className="font-semibold">{n.title}</div>{n.body && <div className="truncate text-sm text-muted">{n.body}</div>}<div className="mt-0.5 text-xs text-muted">{ago(n.createdAt)}</div></div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
