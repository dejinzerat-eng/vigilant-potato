import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, SearchX, Sparkles } from 'lucide-react';
import { filtersFor, toSearchString, type SearchParams } from '@dej/shared';
import { api } from '@/lib/api';
import { plural } from '@/lib/format';
import type { Category, SearchResult } from '@/lib/types';
import { CompareBar } from './compare';
import { Filters } from './filters';
import { ListingGrid } from './listing-card';
import { SaveSearch } from './save-search';
import { SortSelect } from './sort-select';

type SP = Record<string, string | string[] | undefined>;

export async function SearchView({ searchParams, category, sub, basePath }: { searchParams: SP; category?: string; sub?: string; basePath: string }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') qs.set(k, v);
  if (category) qs.set('kategorie', category);
  if (sub) qs.set('pod', sub);
  const [cats, res] = await Promise.all([
    api<Category[]>('/categories', { revalidate: 60, auth: false }),
    api<SearchResult & { params: SearchParams }>(`/search?${qs}`, { auth: false }),
  ]);
  const p = res.params;
  // Chytré hledání: přesměrujeme na URL s rozpoznanými filtry, ať je panel filtrů vyplněný a odkaz sdílitelný
  if (qs.get('chytre') === '1' && res.recognized?.length) {
    redirect(`${basePath}?${toSearchString(basePath === '/hledat' ? p : { ...p, category: undefined, sub: undefined })}&rozpoznano=${encodeURIComponent(res.recognized.join('|'))}`);
  }
  const recognized = typeof searchParams.rozpoznano === 'string' ? searchParams.rozpoznano.split('|') : [];
  const cat = cats.find((c) => c.slug === p.category);
  const subCat = cat?.children.find((s) => s.slug === p.sub);
  const filters = p.category ? filtersFor(p.category, p.sub) : [];
  const title = p.q ? `„${p.q}“` : subCat?.name ?? cat?.name ?? 'Všechny inzeráty';
  const pageHref = (n: number) => {
    const { category: _c, sub: _s, ...rest } = p;
    const s = toSearchString({ ...(basePath === '/hledat' ? p : rest), page: n });
    return `${basePath}${s ? `?${s}` : ''}`;
  };

  return (
    <div className="container-x py-6 sm:py-8">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted" aria-label="Drobečková navigace">
        <Link href="/" className="hover:text-ink">Domů</Link><span>/</span>
        {cat ? <Link href={`/kategorie/${cat.slug}`} className="hover:text-ink">{cat.name}</Link> : <span>Hledání</span>}
        {subCat && <><span>/</span><Link href={`/kategorie/${cat!.slug}/${subCat.slug}`} className="hover:text-ink">{subCat.name}</Link></>}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-muted">{plural(res.total, 'inzerát', 'inzeráty', 'inzerátů')}</p>
        </div>
        <SaveSearch params={p} label={[p.q, subCat?.name ?? cat?.name, p.city, p.priceMax ? `do ${p.priceMax} Kč` : ''].filter(Boolean).join(', ') || 'Všechny inzeráty'} />
      </div>
      {recognized.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-soft bg-brand-soft/50 px-4 py-3 text-sm">
          <Sparkles className="size-4 text-brand" /><span className="text-ink-2">Rozpoznali jsme:</span>
          {recognized.map((r) => <span key={r} className="rounded-full bg-surface px-2.5 py-0.5 font-semibold">{r}</span>)}
        </div>
      )}
      {cat && !subCat && (
        <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {cat.children.map((s) => <Link key={s.slug} href={`/kategorie/${cat.slug}/${s.slug}`} className="chip shrink-0">{s.name}<span className="text-muted">{s.count}</span></Link>)}
        </div>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Filters categories={cats} filters={filters} fixedCategory={basePath !== '/hledat'} />
          <div className="lg:hidden"><SortSelect hasGeo={!!p.city} /></div>
        </div>
        <section aria-label="Výsledky" className="-mt-4 lg:mt-0">
          <div className="mb-4 hidden items-center justify-end gap-3 lg:flex">
            <SortSelect hasGeo={!!p.city} />
          </div>
          {res.hits.length ? <ListingGrid items={res.hits} /> : (
            <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
              <SearchX className="size-10 text-muted" strokeWidth={1.5} />
              <h2 className="text-lg font-bold">Nic jsme nenašli</h2>
              <p className="max-w-sm text-muted">Zkuste upravit filtry, nebo si hledání uložte – pošleme vám upozornění, jakmile se objeví odpovídající inzerát.</p>
            </div>
          )}
          {res.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Stránkování">
              {res.page > 1 && <Link href={pageHref(res.page - 1)} className="btn btn-outline btn-sm"><ChevronLeft className="size-4" />Předchozí</Link>}
              <span className="px-3 text-sm text-muted">Strana {res.page} z {res.pages}</span>
              {res.page < res.pages && <Link href={pageHref(res.page + 1)} className="btn btn-outline btn-sm">Další<ChevronRight className="size-4" /></Link>}
            </nav>
          )}
        </section>
      </div>
      <CompareBar />
    </div>
  );
}
