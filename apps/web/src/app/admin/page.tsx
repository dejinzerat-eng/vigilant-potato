import { api } from '@/lib/api';
import { price } from '@/lib/format';

interface Stats { users: number; users7: number; listings: number; active: number; listings24: number; listings7: number; pending: number; reports: number; messages7: number; revenue30: number; byCategory: { name: string; count: number }[]; daily: { date: string; listings: number; users: number }[]; searchEngine: string }

export default async function Page() {
  const s = await api<Stats>('/admin/stats');
  const max = Math.max(1, ...s.daily.map((d) => d.listings));
  const catMax = Math.max(1, ...s.byCategory.map((c) => c.count));
  const tiles = [
    ['Aktivní inzeráty', s.active, `${s.listings7} nových za 7 dní`], ['Uživatelé', s.users, `${s.users7} nových za 7 dní`],
    ['Ke schválení', s.pending, 'inzerátů čeká'], ['Nahlášení', s.reports, 'otevřených'], ['Zprávy', s.messages7, 'za 7 dní'], ['Tržby (30 dní)', price(s.revenue30), 'platby ve fázi 2'],
  ] as const;
  return (
    <div className="space-y-6">
      <h1 className="h-display text-3xl font-bold">Přehled</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(([l, v, sub]) => <div key={l} className="card p-4"><div className="text-sm text-muted">{l}</div><div className="mt-1 text-3xl font-bold tracking-tight">{typeof v === 'number' ? new Intl.NumberFormat('cs-CZ').format(v) : v}</div><div className="text-xs text-muted">{sub}</div></div>)}
      </div>
      <div className="card p-5">
        <h2 className="font-bold">Nové inzeráty za 30 dní</h2>
        <div className="mt-4 flex h-40 items-end gap-1" role="img" aria-label="Graf nových inzerátů po dnech">
          {s.daily.map((d) => <div key={d.date} className="group relative flex-1 rounded-t bg-brand/80 hover:bg-brand" style={{ height: `${(d.listings / max) * 100}%`, minHeight: 2 }} title={`${d.date}: ${d.listings} inzerátů, ${d.users} registrací`} />)}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{s.daily[0]?.date}</span><span>{s.daily.at(-1)?.date}</span></div>
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-bold">Aktivní inzeráty podle kategorií</h2>
        <ul className="space-y-2">{s.byCategory.map((c) => <li key={c.name} className="grid grid-cols-[160px_1fr_40px] items-center gap-3 text-sm"><span className="truncate">{c.name}</span><span className="h-2.5 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-ink" style={{ width: `${(c.count / catMax) * 100}%` }} /></span><span className="text-right tabular-nums">{c.count}</span></li>)}</ul>
      </div>
      <p className="text-xs text-muted">Vyhledávání: {s.searchEngine}. Návštěvnost se bude měřit přes Google Analytics 4 / Plausible po nasazení na doménu.</p>
    </div>
  );
}
