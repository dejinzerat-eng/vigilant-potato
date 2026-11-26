'use client';
import { CITIES, CONDITIONS, OFFER_TYPES, REGIONS } from '@dej/shared';
import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Category, FilterDef } from '@/lib/types';

/** Panel filtrů. Mění parametry v URL → stránka se znovu vykreslí na serveru (sdílitelné a indexovatelné odkazy). */
export function Filters({ categories, filters, fixedCategory }: { categories: Category[]; filters: FilterDef[]; fixedCategory?: boolean }) {
  const sp = useSearchParams()!;
  const router = useRouter();
  const path = usePathname()!;
  const [open, setOpen] = useState(false);

  function set(updates: Record<string, string | undefined>) {
    const u = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) { if (v === undefined || v === '') u.delete(k); else u.set(k, v); }
    u.delete('strana'); u.delete('chytre'); u.delete('rozpoznano');
    router.push(`${path}?${u.toString()}`, { scroll: false });
  }
  const get = (k: string) => sp.get(k) ?? '';
  const list = (k: string) => (sp.get(k) ?? '').split(',').filter(Boolean);
  const toggle = (k: string, v: string) => { const cur = new Set(list(k)); cur.has(v) ? cur.delete(v) : cur.add(v); set({ [k]: [...cur].join(',') }); };

  const cat = categories.find((c) => c.slug === get('kategorie'));
  const activeCount = [...sp.keys()].filter((k) => !['q', 'razeni', 'strana', 'chytre'].includes(k) && !(fixedCategory && ['kategorie', 'pod'].includes(k))).length;

  const panel = (
    <div className="space-y-6">
      {!fixedCategory && (
        <Field label="Kategorie">
          <select className="input" value={get('kategorie')} onChange={(e) => set({ kategorie: e.target.value, pod: undefined })}>
            <option value="">Všechny kategorie</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          {cat && (
            <select className="input mt-2" value={get('pod')} onChange={(e) => set({ pod: e.target.value })}>
              <option value="">Všechny podkategorie</option>
              {cat.children.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          )}
        </Field>
      )}
      <Field label="Cena (Kč)">
        <div className="flex items-center gap-2">
          <NumInput value={get('cena_od')} placeholder="od" onCommit={(v) => set({ cena_od: v })} />
          <span className="text-muted">–</span>
          <NumInput value={get('cena_do')} placeholder="do" onCommit={(v) => set({ cena_do: v })} />
        </div>
      </Field>
      <Field label="Lokalita">
        <select className="input" value={get('mesto')} onChange={(e) => set({ mesto: e.target.value, okruh: e.target.value ? get('okruh') || '20' : undefined })}>
          <option value="">Celá ČR</option>
          {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {get('mesto') ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['0', '10', '20', '50', '100'].map((r) => (
              <button key={r} onClick={() => set({ okruh: r === '0' ? undefined : r })} className={`chip h-7 text-[13px] ${(get('okruh') || '0') === r ? 'chip-active' : ''}`}>{r === '0' ? 'jen město' : `+${r} km`}</button>
            ))}
          </div>
        ) : (
          <select className="input mt-2" value={get('kraj')} onChange={(e) => set({ kraj: e.target.value })}>
            <option value="">Všechny kraje</option>
            {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Stav">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => <button key={c.value} onClick={() => toggle('stav', c.value)} className={`chip ${list('stav').includes(c.value) ? 'chip-active' : ''}`}>{c.label}</button>)}
        </div>
      </Field>
      <Field label="Typ nabídky">
        <div className="flex flex-wrap gap-1.5">
          {OFFER_TYPES.map((c) => <button key={c.value} onClick={() => set({ typ: get('typ') === c.value ? undefined : c.value })} className={`chip ${get('typ') === c.value ? 'chip-active' : ''}`}>{c.label}</button>)}
        </div>
      </Field>
      <Field label="Přidáno">
        <div className="flex flex-wrap gap-1.5">
          {[['', 'Kdykoli'], ['24h', '24 hodin'], ['7d', '7 dní'], ['30d', '30 dní']].map(([v, l]) => <button key={v} onClick={() => set({ od: v })} className={`chip ${get('od') === v ? 'chip-active' : ''}`}>{l}</button>)}
        </div>
      </Field>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <input type="checkbox" className="size-5 accent-[var(--trust)]" checked={get('overeny') === '1'} onChange={(e) => set({ overeny: e.target.checked ? '1' : undefined })} />
        <span className="text-[15px] font-medium">Jen ověření prodejci</span>
      </label>
      {filters.length > 0 && (
        <div className="space-y-6 border-t border-line pt-6">
          {filters.map((f) => <AttrFilter key={f.key} f={f} get={get} list={list} set={set} toggle={toggle} />)}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-outline btn-sm lg:hidden">
        <SlidersHorizontal className="size-4" />Filtry{activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{activeCount}</span>}
      </button>
      <aside className="hidden lg:block">{panel}{activeCount > 0 && <button onClick={() => router.push(`${path}${sp.get('q') ? `?q=${encodeURIComponent(sp.get('q')!)}` : ''}`)} className="btn btn-ghost btn-sm mt-4 w-full">Zrušit filtry</button>}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtry">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute inset-x-0 bottom-0 top-12 flex flex-col rounded-t-3xl bg-paper">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-lg font-bold">Filtry</h2>
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Zavřít"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{panel}</div>
            <div className="border-t border-line p-4"><button onClick={() => setOpen(false)} className="btn btn-dark w-full">Zobrazit výsledky</button></div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label">{label}</div>{children}</div>;
}

function NumInput({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input inputMode="numeric" className="input" value={v} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} onBlur={() => v !== value && onCommit(v)} onKeyDown={(e) => e.key === 'Enter' && onCommit(v)} />;
}

function AttrFilter({ f, get, list, set, toggle }: { f: FilterDef; get: (k: string) => string; list: (k: string) => string[]; set: (u: Record<string, string | undefined>) => void; toggle: (k: string, v: string) => void }) {
  const k = `p_${f.key}`;
  if (f.type === 'range') return (
    <Field label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`}>
      <div className="flex items-center gap-2">
        <NumInput value={get(`${k}_od`)} placeholder="od" onCommit={(v) => set({ [`${k}_od`]: v })} />
        <span className="text-muted">–</span>
        <NumInput value={get(`${k}_do`)} placeholder="do" onCommit={(v) => set({ [`${k}_do`]: v })} />
      </div>
    </Field>
  );
  if (f.type === 'boolean') return (
    <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--brand)]" checked={get(k) === '1'} onChange={(e) => set({ [k]: e.target.checked ? '1' : undefined })} /><span className="text-[15px] font-medium">{f.label}</span></label>
  );
  if ((f.options?.length ?? 0) > 8) return (
    <Field label={f.label}>
      <select className="input" value={get(k)} onChange={(e) => set({ [k]: e.target.value })}>
        <option value="">Nezáleží</option>
        {f.options!.map((o) => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
  return (
    <Field label={f.label}>
      <div className="flex flex-wrap gap-1.5">{f.options!.map((o) => <button key={o} onClick={() => toggle(k, o)} className={`chip ${list(k).includes(o) ? 'chip-active' : ''}`}>{o}</button>)}</div>
    </Field>
  );
}
