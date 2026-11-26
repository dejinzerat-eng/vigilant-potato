'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';
import { ago, listingUrl } from '@/lib/format';
import { useToast } from '../toast';

function useAct() {
  const router = useRouter(); const toast = useToast();
  return async (fn: () => Promise<unknown>, ok = 'Uloženo') => { try { await fn(); toast(ok); router.refresh(); } catch (e) { toast((e as Error).message, 'error'); } };
}

export function Reports({ rows }: { rows: { id: string; targetType: string; targetId: string; reason: string; note: string | null; createdAt: string; reporter: { name: string; email: string }; listing?: { id: string; slug: string; title: string; status: string }; user?: { id: string; name: string; email: string; status: string } }[] }) {
  const act = useAct();
  if (!rows.length) return <div className="card p-10 text-center text-muted">Žádná otevřená nahlášení. 🎉</div>;
  return (
    <ul className="space-y-3">{rows.map((r) => (
      <li key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="badge bg-danger-soft text-danger">{r.reason}</span><span className="text-muted">{r.targetType === 'LISTING' ? 'Inzerát' : r.targetType === 'USER' ? 'Uživatel' : 'Zpráva'} · {ago(r.createdAt)} · nahlásil(a) {r.reporter.name}</span></div>
          <div className="mt-1 font-semibold">
            {r.listing ? <Link className="hover:underline" target="_blank" href={listingUrl(r.listing)}>{r.listing.title}</Link> : r.user ? <Link className="hover:underline" target="_blank" href={`/uzivatel/${r.user.id}`}>{r.user.name} ({r.user.email})</Link> : r.targetId}
          </div>
          {r.note && <p className="mt-1 text-sm text-muted">„{r.note}“</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {r.listing && <button onClick={() => act(() => call(`/admin/listings/${r.listing!.id}/moderate`, 'POST', { action: 'reject', reason: r.reason }).then(() => call(`/admin/reports/${r.id}/resolve`, 'POST', { status: 'RESOLVED' })))} className="btn btn-danger btn-sm">Stáhnout inzerát</button>}
          {r.user && <button onClick={() => act(() => call(`/admin/users/${r.user!.id}`, 'PATCH', { status: 'BLOCKED' }).then(() => call(`/admin/reports/${r.id}/resolve`, 'POST', { status: 'RESOLVED' })))} className="btn btn-danger btn-sm">Zablokovat účet</button>}
          <button onClick={() => act(() => call(`/admin/reports/${r.id}/resolve`, 'POST', { status: 'DISMISSED' }))} className="btn btn-outline btn-sm">Zamítnout</button>
        </div>
      </li>
    ))}</ul>
  );
}

export function UsersTable({ rows }: { rows: { id: string; email: string; name: string; role: string; status: string; createdAt: string; lastSeenAt: string | null; phoneVerifiedAt: string | null; _count: { listings: number } }[] }) {
  const act = useAct();
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-muted"><tr className="[&_th]:px-4 [&_th]:py-3 [&_th]:font-medium"><th>Uživatel</th><th>Registrace</th><th>Inzeráty</th><th>Role</th><th>Stav</th></tr></thead>
        <tbody>{rows.map((u) => (
          <tr key={u.id} className="border-t border-line [&_td]:px-4 [&_td]:py-2.5">
            <td><Link href={`/uzivatel/${u.id}`} className="font-semibold hover:underline">{u.name}</Link><div className="text-muted">{u.email}{u.phoneVerifiedAt && ' · ☎ ověřen'}</div></td>
            <td className="text-muted">{ago(u.createdAt)}</td>
            <td>{u._count.listings}</td>
            <td><select className="input h-8 w-36 text-sm" defaultValue={u.role} onChange={(e) => act(() => call(`/admin/users/${u.id}`, 'PATCH', { role: e.target.value }))}><option value="USER">Uživatel</option><option value="MODERATOR">Moderátor</option><option value="ADMIN">Administrátor</option></select></td>
            <td>{u.status === 'ACTIVE' ? <button onClick={() => confirm(`Zablokovat ${u.email}? Jeho inzeráty budou staženy.`) && act(() => call(`/admin/users/${u.id}`, 'PATCH', { status: 'BLOCKED' }))} className="btn btn-outline btn-sm">Zablokovat</button> : <button onClick={() => act(() => call(`/admin/users/${u.id}`, 'PATCH', { status: 'ACTIVE' }))} className="btn btn-danger btn-sm">Odblokovat</button>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

type Cat = { id: string; slug: string; name: string; parentId: string | null; position: number; active: boolean; seoTitle: string | null; seoDescription: string | null; filters: unknown[] };
export function CategoriesEditor({ rows }: { rows: Cat[] }) {
  const act = useAct();
  const [edit, setEdit] = useState<Cat | null>(null);
  const [filtersJson, setFiltersJson] = useState('');
  const parents = rows.filter((r) => !r.parentId);
  const [newCat, setNewCat] = useState({ name: '', slug: '', parentId: '' });
  return (
    <div className="space-y-4">
      <form className="card flex flex-wrap items-end gap-2 p-4" onSubmit={(e) => { e.preventDefault(); act(() => call('/admin/categories', 'POST', { ...newCat, parentId: newCat.parentId || null }), 'Kategorie přidána'); }}>
        <div><label className="label">Nová kategorie</label><input className="input" placeholder="Název" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value, slug: e.target.value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></div>
        <div><label className="label">Adresa (slug)</label><input className="input" value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} /></div>
        <div><label className="label">Nadřazená</label><select className="input" value={newCat.parentId} onChange={(e) => setNewCat({ ...newCat, parentId: e.target.value })}><option value="">— hlavní kategorie —</option>{parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <button className="btn btn-dark">Přidat</button>
      </form>
      <div className="card divide-y divide-line">
        {parents.map((p) => (
          <details key={p.id} className="group">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 font-semibold"><span className="flex-1">{p.name}</span>{!p.active && <span className="badge bg-surface-2">skrytá</span>}<button type="button" onClick={(e) => { e.preventDefault(); setEdit(p); setFiltersJson(JSON.stringify(p.filters, null, 2)); }} className="btn btn-ghost btn-sm">Upravit</button></summary>
            <ul className="pb-2">{rows.filter((s) => s.parentId === p.id).map((s) => <li key={s.id} className="flex items-center gap-3 px-8 py-1.5 text-sm"><span className="flex-1">{s.name} <span className="text-muted">/{s.slug}</span></span>{!s.active && <span className="badge bg-surface-2">skrytá</span>}<button onClick={() => { setEdit(s); setFiltersJson(JSON.stringify(s.filters, null, 2)); }} className="btn btn-ghost btn-sm">Upravit</button></li>)}</ul>
          </details>
        ))}
      </div>
      {edit && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setEdit(null)} />
          <form className="relative max-h-[90dvh] w-full max-w-xl space-y-3 overflow-y-auto rounded-3xl bg-surface p-6" onSubmit={(e) => { e.preventDefault(); let filters; try { filters = JSON.parse(filtersJson); } catch { alert('Filtry nejsou platný JSON'); return; } act(() => call(`/admin/categories/${edit.id}`, 'PUT', { name: edit.name, active: edit.active, position: edit.position, seoTitle: edit.seoTitle, seoDescription: edit.seoDescription, filters })).then(() => setEdit(null)); }}>
            <h2 className="text-lg font-bold">Upravit kategorii</h2>
            <div><label className="label">Název</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="flex gap-3"><div className="flex-1"><label className="label">Pořadí</label><input type="number" className="input" value={edit.position} onChange={(e) => setEdit({ ...edit, position: Number(e.target.value) })} /></div><label className="mt-7 flex items-center gap-2"><input type="checkbox" className="size-5" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Zobrazit</label></div>
            <div><label className="label">SEO titulek</label><input className="input" value={edit.seoTitle ?? ''} onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })} /></div>
            <div><label className="label">SEO popis (meta description)</label><textarea className="input" rows={2} value={edit.seoDescription ?? ''} onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })} /></div>
            <div><label className="label">Filtry a parametry (JSON)</label><textarea className="input font-mono text-xs" rows={8} value={filtersJson} onChange={(e) => setFiltersJson(e.target.value)} /></div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEdit(null)} className="btn btn-ghost">Zrušit</button><button className="btn btn-dark">Uložit</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

type Price = { code: string; name: string; description: string | null; priceCzk: number; durationDays: number | null; active: boolean };
export function PricesEditor({ rows }: { rows: Price[] }) {
  const act = useAct();
  return (
    <div className="space-y-3">{rows.map((p) => <PriceRow key={p.code} p={p} save={(v) => act(() => call(`/admin/prices/${p.code}`, 'PUT', v))} />)}</div>
  );
}
function PriceRow({ p, save }: { p: Price; save: (v: Omit<Price, 'code'>) => void }) {
  const [v, setV] = useState(p);
  return (
    <form className="card grid gap-3 p-4 sm:grid-cols-[1fr_120px_100px_auto]" onSubmit={(e) => { e.preventDefault(); const { code: _c, ...rest } = v; save(rest); }}>
      <div><input className="input font-semibold" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Název" /><input className="input mt-2 text-sm" value={v.description ?? ''} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Popis" /></div>
      <div><label className="label text-xs">Cena (Kč)</label><input type="number" className="input" value={v.priceCzk} onChange={(e) => setV({ ...v, priceCzk: Number(e.target.value) })} /></div>
      <div><label className="label text-xs">Dní</label><input type="number" className="input" value={v.durationDays ?? ''} onChange={(e) => setV({ ...v, durationDays: e.target.value ? Number(e.target.value) : null })} /></div>
      <div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />Aktivní</label><button className="btn btn-dark btn-sm">Uložit</button></div>
    </form>
  );
}

export function PagesEditor({ rows }: { rows: { slug: string; title: string; content: string }[] }) {
  const act = useAct();
  const [sel, setSel] = useState(rows[0]);
  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <ul className="space-y-1">{rows.map((r) => <li key={r.slug}><button onClick={() => setSel(r)} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${sel?.slug === r.slug ? 'bg-ink text-paper' : 'hover:bg-surface-2'}`}>{r.title}</button></li>)}</ul>
      {sel && <form key={sel.slug} className="card space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act(() => call(`/admin/pages/${sel.slug}`, 'PUT', { title: f.get('title'), content: f.get('content') })); }}>
        <div><label className="label">Titulek</label><input name="title" className="input" defaultValue={sel.title} /></div>
        <div><label className="label">Obsah</label><textarea name="content" className="input min-h-80" defaultValue={sel.content} /></div>
        <div className="flex items-center justify-between"><Link href={`/stranka/${sel.slug}`} target="_blank" className="text-sm text-brand-ink hover:underline">Zobrazit stránku</Link><button className="btn btn-dark">Uložit</button></div>
      </form>}
    </div>
  );
}
