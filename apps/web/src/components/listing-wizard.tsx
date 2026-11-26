'use client';
import { CATEGORIES, CITIES, CONDITIONS, filtersFor, OFFER_TYPES } from '@dej/shared';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronLeft, ChevronRight, ImagePlus, Lightbulb, Loader2, MapPin, Sparkles, Star, Trash2, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { shrinkImage } from '@/lib/image';
import { useEffect, useRef, useState } from 'react';
import { call } from '@/lib/client';
import { CONDITION_LABEL, price as fmtPrice } from '@/lib/format';
import { CategoryIcon } from './icons';
import { useToast } from './toast';

export interface WizardInitial {
  id?: string; title: string; description: string; price: number | null; priceNegotiable: boolean; currency: 'CZK' | 'EUR';
  categorySlug: string; subSlug: string; condition: string | null; offerType: string; city: string; zip: string;
  attributes: Record<string, unknown>; images: { id: string; url: string; thumbUrl: string }[]; videoUrl: string; status?: string;
}
const EMPTY: WizardInitial = { title: '', description: '', price: null, priceNegotiable: false, currency: 'CZK', categorySlug: '', subSlug: '', condition: null, offerType: 'SELL', city: '', zip: '', attributes: {}, images: [], videoUrl: '' };
const STEPS = ['Co nabízíte', 'Fotky', 'Podrobnosti', 'Cena a místo', 'Náhled'];
const DRAFT_KEY = 'dej_wizard_draft';

export function ListingWizard({ initial, defaultCity }: { initial?: WizardInitial; defaultCity?: string | null }) {
  const [d, setD] = useState<WizardInitial>(initial ?? { ...EMPTY, city: defaultCity ?? '' });
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter(); const toast = useToast();
  const editing = !!initial?.id;
  const up = (p: Partial<WizardInitial>) => setD((x) => ({ ...x, ...p }));

  // Rozpracovaný nový inzerát si pamatujeme v prohlížeči
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (editing) return;
    try { const s = localStorage.getItem(DRAFT_KEY); const v = s ? JSON.parse(s) : null; if (v?.title) { setD((cur) => (cur.title ? cur : { ...EMPTY, ...v })); setRestored(true); } } catch { /* */ }
  }, [editing]);
  useEffect(() => { if (!editing && d.title) try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* */ } }, [d, editing]);

  function validate(s: number): string | null {
    if (s === 0) { if (d.title.trim().length < 5) return 'Napište název (alespoň 5 znaků).'; if (!d.subSlug) return 'Vyberte kategorii a podkategorii.'; }
    if (s === 2 && d.description.trim().length < 20) return 'Popis musí mít alespoň 20 znaků.';
    if (s === 3) { if (!d.city.trim()) return 'Zadejte lokalitu.'; if (d.zip && !/^\d{3}\s?\d{2}$/.test(d.zip)) return 'PSČ má 5 číslic.'; }
    return null;
  }
  function next() { const e = validate(step); setErr(e); if (!e) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  function back() { setErr(null); setStep((s) => Math.max(0, s - 1)); }

  async function submit(publish: boolean) {
    for (let s = 0; s < 4; s++) { const e = validate(s); if (e) { setStep(s); setErr(e); return; } }
    setBusy(true); setErr(null);
    const body = { title: d.title, description: d.description, price: d.price, priceNegotiable: d.priceNegotiable, currency: d.currency, categorySlug: d.categorySlug, subSlug: d.subSlug, condition: d.condition, offerType: d.offerType, city: d.city, zip: d.zip, attributes: d.attributes, imageIds: d.images.map((i) => i.id), videoUrl: d.videoUrl, publish };
    try {
      const r = editing ? await call<{ id: string; status: string }>(`/listings/${d.id}`, 'PATCH', body) : await call<{ id: string; status: string }>('/listings', 'POST', body);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
      toast(r.status === 'PENDING' ? 'Inzerát čeká na kontrolu moderátorem.' : publish ? (editing ? 'Změny uloženy' : 'Inzerát je zveřejněný!') : 'Koncept uložen');
      router.push(`/muj-ucet/inzeraty?novy=${r.id}`); router.refresh();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex items-center gap-1.5" aria-label="Kroky">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2">
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className={`h-1.5 rounded-full transition ${i <= step ? 'bg-brand' : 'bg-line'}`} aria-label={s} aria-current={i === step ? 'step' : undefined} />
            <span className={`hidden text-xs font-medium sm:block ${i === step ? 'text-ink' : 'text-muted'}`}>{i + 1}. {s}</span>
          </li>
        ))}
      </ol>
      <h1 className="h-display mb-6 text-3xl font-bold">{STEPS[step]}</h1>
      {restored && step === 0 && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm">
          <span>Pokračujete v rozpracovaném inzerátu.</span>
          <button type="button" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ } setD({ ...EMPTY, city: defaultCity ?? '' }); setRestored(false); }} className="font-semibold text-brand-ink hover:underline">Začít znovu</button>
        </div>
      )}

      {step === 0 && <StepBasics d={d} up={up} />}
      {step === 1 && <StepPhotos d={d} up={up} />}
      {step === 2 && <StepDetails d={d} up={up} />}
      {step === 3 && <StepPrice d={d} up={up} />}
      {step === 4 && <StepPreview d={d} />}

      {err && <p role="alert" className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{err}</p>}

      <div className="sticky bottom-0 -mx-4 mt-8 flex items-center gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        {step > 0 && <button type="button" onClick={back} className="btn btn-ghost"><ArrowLeft className="size-4" />Zpět</button>}
        <div className="ml-auto flex gap-2">
          {step === 4 ? (
            <>
              {(!editing || d.status === 'DRAFT') && <button type="button" onClick={() => submit(false)} disabled={busy} className="btn btn-outline">Uložit koncept</button>}
              <button type="button" onClick={() => submit(true)} disabled={busy} className="btn btn-primary">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{editing && d.status !== 'DRAFT' ? 'Uložit změny' : 'Zveřejnit inzerát'}</button>
            </>
          ) : <button type="button" onClick={next} className="btn btn-dark">Pokračovat<ArrowRight className="size-4" /></button>}
        </div>
      </div>
    </div>
  );
}

type StepProps = { d: WizardInitial; up: (p: Partial<WizardInitial>) => void };

function StepBasics({ d, up }: StepProps) {
  const [sugg, setSugg] = useState<{ parent: string; sub: string; name: string }[]>([]);
  const [pick, setPick] = useState(!d.subSlug);
  useEffect(() => {
    if (d.title.trim().length < 3) { setSugg([]); return; }
    const t = setTimeout(() => call<typeof sugg>(`/listings/suggest-category?title=${encodeURIComponent(d.title)}`).then(setSugg).catch(() => {}), 350);
    return () => clearTimeout(t);
  }, [d.title]);
  const cat = CATEGORIES.find((c) => c.slug === d.categorySlug);
  const sub = cat?.children.find((s) => s.slug === d.subSlug);
  return (
    <div className="space-y-6">
      <div>
        <label className="label" htmlFor="t">Název inzerátu</label>
        <input id="t" className="input h-13 text-lg" maxLength={90} autoFocus value={d.title} onChange={(e) => up({ title: e.target.value })} placeholder="Např. iPhone 15 Pro 256 GB, modrý" />
        <div className="mt-1.5 flex justify-between text-xs text-muted"><span>Napište značku, model a hlavní parametr – kupující to hledají.</span><span>{d.title.length}/90</span></div>
      </div>
      <div>
        <div className="label">Typ nabídky</div>
        <div className="flex flex-wrap gap-2">{OFFER_TYPES.map((o) => <button type="button" key={o.value} onClick={() => up({ offerType: o.value })} className={`chip h-10 px-4 ${d.offerType === o.value ? 'chip-active' : ''}`}>{o.label}</button>)}</div>
      </div>
      <div>
        <div className="label">Kategorie</div>
        {sugg.length > 0 && pick && (
          <div className="mb-3 rounded-2xl border border-brand-soft bg-brand-soft/40 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-ink"><Sparkles className="size-4" />Doporučené podle názvu</div>
            <div className="flex flex-wrap gap-2">
              {sugg.map((s) => {
                const c = CATEGORIES.find((x) => x.slug === s.parent);
                return <button type="button" key={s.sub} onClick={() => { up({ categorySlug: s.parent, subSlug: s.sub, attributes: {} }); setPick(false); }} className="chip h-10 bg-surface">{c?.name} › <b>{s.name}</b></button>;
              })}
            </div>
          </div>
        )}
        {sub && !pick ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><CategoryIcon name={cat!.icon} className="size-5" /></span>
            <div className="flex-1"><div className="text-sm text-muted">{cat!.name}</div><div className="font-semibold">{sub.name}</div></div>
            <button type="button" onClick={() => setPick(true)} className="btn btn-ghost btn-sm">Změnit</button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={d.categorySlug} onChange={(e) => up({ categorySlug: e.target.value, subSlug: '', attributes: {} })} aria-label="Kategorie">
              <option value="">Vyberte kategorii</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select className="input" value={d.subSlug} disabled={!cat} onChange={(e) => { up({ subSlug: e.target.value }); if (e.target.value) setPick(false); }} aria-label="Podkategorie">
              <option value="">Podkategorie</option>
              {cat?.children.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

function StepPhotos({ d, up }: StepProps) {
  const [uploading, setUploading] = useState(0);
  const [drag, setDrag] = useState(false);
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const imgs = useRef(d.images); imgs.current = d.images;

  async function add(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 20 - d.images.length);
    setUploading((n) => n + list.length);
    await Promise.all(list.map(async (f) => {
      const fd = new FormData(); fd.append('file', await shrinkImage(f));
      try {
        const r = await call<{ id: string; url: string; thumbUrl: string }>('/media/image', 'POST', fd);
        up({ images: [...imgs.current, r] }); imgs.current = [...imgs.current, r];
      } catch (e) { toast(`${f.name}: ${(e as Error).message}`, 'error'); }
      finally { setUploading((n) => n - 1); }
    }));
  }
  const move = (i: number, dir: number) => { const a = [...d.images]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; up({ images: a }); };

  return (
    <div className="space-y-6">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}>
        <ImagePlus className="size-10 text-muted" strokeWidth={1.5} />
        <div><div className="font-semibold">Přetáhněte fotky sem</div><div className="text-sm text-muted">až 20 fotek · JPG, PNG, WebP, HEIC · do 15 MB</div></div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => input.current?.click()} className="btn btn-dark btn-sm">Vybrat fotky</button>
          <button type="button" onClick={() => camera.current?.click()} className="btn btn-outline btn-sm sm:hidden"><Camera className="size-4" />Vyfotit</button>
        </div>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && add(e.target.files)} />
      </div>
      {(d.images.length > 0 || uploading > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {d.images.map((im, i) => (
            <li key={im.id} className="group relative overflow-hidden rounded-2xl border border-line bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumbUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              {i === 0 && <span className="badge absolute left-2 top-2 bg-ink text-paper"><Star className="size-3" />Hlavní</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 p-1.5">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink disabled:opacity-40" aria-label="Posunout dopředu"><ChevronLeft className="size-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === d.images.length - 1} className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink disabled:opacity-40" aria-label="Posunout dozadu"><ChevronRight className="size-4" /></button>
                </div>
                <button type="button" onClick={() => up({ images: d.images.filter((x) => x.id !== im.id) })} className="grid size-8 place-items-center rounded-lg bg-white/90 text-danger" aria-label="Smazat fotku"><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, i) => <li key={`u${i}`} className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-surface-2"><Loader2 className="size-6 animate-spin text-muted" /></li>)}
        </ul>
      )}
      <p className="flex items-start gap-2 text-sm text-muted"><Lightbulb className="mt-0.5 size-4 shrink-0 text-top" />Inzeráty s 5 a více fotkami při denním světle dostávají výrazně víc zpráv. Z fotek automaticky odstraníme polohu GPS.</p>
      <div>
        <label className="label" htmlFor="v">Video (nepovinné)</label>
        <input id="v" className="input" placeholder="Odkaz na YouTube nebo Vimeo" value={d.videoUrl} onChange={(e) => up({ videoUrl: e.target.value })} />
      </div>
    </div>
  );
}

function StepDetails({ d, up }: StepProps) {
  const filters = filtersFor(d.categorySlug, d.subSlug);
  const setA = (k: string, v: unknown) => up({ attributes: { ...d.attributes, [k]: v } });
  function draft() {
    const parts = filters.map((f) => { const v = d.attributes[f.key]; if (v === undefined || v === '' || v === false) return null; return `• ${f.label}: ${f.type === 'boolean' ? 'ano' : Array.isArray(v) ? v.join(', ') : v}${f.unit ? ` ${f.unit}` : ''}`; }).filter(Boolean);
    const cond = d.condition ? { NEW: 'Zboží je nové, nepoužité.', LIKE_NEW: 'Ve stavu jako nové, bez viditelných známek používání.', USED: 'Používané, plně funkční, s běžnými stopami používání.', DAMAGED: 'Poškozené – vhodné na opravu nebo na díly.' }[d.condition] : '';
    const text = `${d.offerType === 'BUY' ? 'Koupím' : d.offerType === 'RENT' ? 'Pronajmu' : 'Nabízím'} ${d.title}.\n\n${cond}\n${parts.length ? `\nParametry:\n${parts.join('\n')}\n` : ''}\nDůvod prodeje: …\nV balení / příslušenství: …\n\nOsobní předání${d.city ? ` v lokalitě ${d.city}` : ''}, případně zašlu. Při rychlém jednání možná sleva.`;
    up({ description: text.replace(/\n{3,}/g, '\n\n') });
  }
  return (
    <div className="space-y-6">
      {!['GIVE'].includes(d.offerType) && (
        <div>
          <div className="label">Stav</div>
          <div className="flex flex-wrap gap-2">{CONDITIONS.map((c) => <button type="button" key={c.value} onClick={() => up({ condition: d.condition === c.value ? null : c.value })} className={`chip h-10 px-4 ${d.condition === c.value ? 'chip-active' : ''}`}>{c.label}</button>)}</div>
        </div>
      )}
      {filters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {filters.map((f) => {
            const v = d.attributes[f.key];
            if (f.type === 'boolean') return <label key={f.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 sm:col-span-1"><input type="checkbox" className="size-5 accent-[var(--brand)]" checked={v === true} onChange={(e) => setA(f.key, e.target.checked)} />{f.label}</label>;
            if (f.type === 'range') return <div key={f.key}><label className="label" htmlFor={f.key}>{f.label}{f.unit ? ` (${f.unit})` : ''}</label><input id={f.key} inputMode="numeric" className="input" value={(v as number | undefined) ?? ''} onChange={(e) => setA(f.key, e.target.value === '' ? undefined : Number(e.target.value.replace(/\D/g, '')))} /></div>;
            return <div key={f.key}><label className="label" htmlFor={f.key}>{f.label}</label><select id={f.key} className="input" value={(v as string | undefined) ?? ''} onChange={(e) => setA(f.key, e.target.value || undefined)}><option value="">Nevyplněno</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select></div>;
          })}
        </div>
      )}
      <div>
        <div className="flex items-end justify-between gap-3">
          <label className="label" htmlFor="desc">Popis</label>
          <button type="button" onClick={draft} className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-ink hover:underline"><Wand2 className="size-4" />Navrhnout popis</button>
        </div>
        <textarea id="desc" className="input min-h-56" maxLength={8000} value={d.description} onChange={(e) => up({ description: e.target.value })} placeholder="Popište stav, stáří, důvod prodeje, co je v balení a jak předáte zboží." />
        <div className="mt-1.5 text-right text-xs text-muted">{d.description.length}/8000</div>
      </div>
    </div>
  );
}

function StepPrice({ d, up }: StepProps) {
  const [sugg, setSugg] = useState<{ sample: number; median: number | null; low?: number; high?: number } | null>(null);
  useEffect(() => { call<typeof sugg>(`/listings/price-suggestion?title=${encodeURIComponent(d.title)}&kategorie=${d.categorySlug}&pod=${d.subSlug}`).then(setSugg).catch(() => {}); }, [d.title, d.categorySlug, d.subSlug]);
  const free = d.offerType === 'GIVE';
  return (
    <div className="space-y-6">
      {!free && (
        <div>
          <label className="label" htmlFor="price">Cena</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input id="price" inputMode="numeric" className="input h-13 pr-14 text-lg font-semibold" value={d.price == null ? '' : new Intl.NumberFormat('cs-CZ').format(d.price)} onChange={(e) => { const n = e.target.value.replace(/\D/g, ''); up({ price: n === '' ? null : Number(n) }); }} placeholder="0" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">{d.currency === 'EUR' ? '€' : 'Kč'}</span>
            </div>
            <select className="input h-13 w-24" value={d.currency} onChange={(e) => up({ currency: e.target.value as 'CZK' | 'EUR' })} aria-label="Měna"><option value="CZK">Kč</option><option value="EUR">€</option></select>
          </div>
          <label className="mt-3 flex items-center gap-3 text-[15px]"><input type="checkbox" className="size-5 accent-[var(--brand)]" checked={d.priceNegotiable} onChange={(e) => up({ priceNegotiable: e.target.checked })} />Cena dohodou / k jednání</label>
          {sugg?.median && (
            <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="size-4 text-brand" />Doporučená cena podle {sugg.sample} podobných nabídek</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3"><span className="text-2xl font-bold">{fmtPrice(sugg.median)}</span><span className="text-sm text-muted">obvykle {fmtPrice(sugg.low!)} – {fmtPrice(sugg.high!)}</span></div>
              <button type="button" onClick={() => up({ price: sugg.median })} className="btn btn-outline btn-sm mt-3">Použít doporučenou cenu</button>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <label className="label" htmlFor="city">Lokalita</label>
          <div className="relative"><MapPin className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input id="city" list="cities" className="input pl-10" value={d.city} onChange={(e) => { const c = CITIES.find((x) => x.name === e.target.value); up({ city: e.target.value, zip: c && !d.zip ? c.zip : d.zip }); }} placeholder="Město nebo obec" />
          </div>
          <datalist id="cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
        </div>
        <div><label className="label" htmlFor="zip">PSČ</label><input id="zip" inputMode="numeric" className="input" maxLength={6} value={d.zip} onChange={(e) => up({ zip: e.target.value })} placeholder="110 00" /></div>
      </div>
    </div>
  );
}

function StepPreview({ d }: { d: WizardInitial }) {
  const cat = CATEGORIES.find((c) => c.slug === d.categorySlug);
  const sub = cat?.children.find((s) => s.slug === d.subSlug);
  return (
    <div className="card overflow-hidden">
      {d.images[0] ? <img src={d.images[0].url} alt="" className="aspect-[16/9] w-full object-cover" /> : <div className="grid aspect-[16/9] place-items-center bg-surface-2 text-muted">Bez fotografií – inzeráty s fotkou mají mnohem víc zájemců</div>}
      <div className="space-y-3 p-6">
        <div className="text-sm text-muted">{cat?.name} › {sub?.name}</div>
        <h2 className="h-display text-2xl font-bold">{d.title}</h2>
        <div className="text-2xl font-bold">{d.offerType === 'GIVE' ? 'Zdarma' : fmtPrice(d.price, d.priceNegotiable, d.currency)}</div>
        <div className="flex flex-wrap gap-2 text-sm"><span className="inline-flex items-center gap-1"><MapPin className="size-4 text-muted" />{d.city}</span>{d.condition && <span className="rounded-md bg-surface-2 px-2">{CONDITION_LABEL[d.condition]}</span>}<span className="text-muted">· {d.images.length} fotek</span></div>
        <p className="whitespace-pre-line border-t border-line pt-3 text-ink-2">{d.description}</p>
      </div>
    </div>
  );
}
