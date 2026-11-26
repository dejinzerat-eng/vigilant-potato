import { api } from '@/lib/api';
type A = { id: string; action: string; targetType: string; targetId: string; meta: unknown; createdAt: string; actor: { name: string; email: string } };
export default async function Page() {
  const rows = await api<A[]>('/admin/audit');
  return (
    <div>
      <h1 className="h-display mb-5 text-3xl font-bold">Auditní log</h1>
      <div className="card overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-muted"><tr className="[&_th]:px-4 [&_th]:py-3 [&_th]:font-medium"><th>Čas</th><th>Kdo</th><th>Akce</th><th>Cíl</th><th>Detail</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line align-top [&_td]:px-4 [&_td]:py-2.5"><td className="whitespace-nowrap text-muted">{new Date(r.createdAt).toLocaleString('cs-CZ')}</td><td>{r.actor.name}</td><td className="font-mono text-xs">{r.action}</td><td className="font-mono text-xs">{r.targetType}/{r.targetId.slice(-8)}</td><td className="max-w-xs truncate font-mono text-xs text-muted">{r.meta ? JSON.stringify(r.meta) : ''}</td></tr>)}</tbody>
      </table>{!rows.length && <p className="p-8 text-center text-muted">Zatím žádné záznamy.</p>}</div>
    </div>
  );
}
