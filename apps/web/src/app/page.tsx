import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { CategoryTile } from '@/components/icons';
import { ListingGrid } from '@/components/listing-card';
import { SearchBox } from '@/components/search-box';
import { api, getMe } from '@/lib/api';
import type { Category, ListingCard } from '@/lib/types';

const POPULAR = ['iPhone 15', 'Byt 2+kk Praha', 'Kočárek', 'Horské kolo do 15 000 Kč', 'Škoda Octavia'];

function Section({ id, title, href, children }: { id: string; title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="container-x pt-12 sm:pt-16" aria-labelledby={id}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {href && <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">Zobrazit vše<ArrowRight className="size-4" /></Link>}
      </div>
      {children}
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ ikony?: string }> }) {
  const variant = (await searchParams).ikony === 'b' ? 'solid' : 'soft';
  const [cats, featured, latest, me] = await Promise.all([
    api<Category[]>('/categories', { revalidate: 60, auth: false }).catch(() => [] as Category[]),
    api<ListingCard[]>('/listings/featured?limit=8', { auth: false }).catch(() => [] as ListingCard[]),
    api<ListingCard[]>('/listings/latest?limit=12', { auth: false }).catch(() => [] as ListingCard[]),
    getMe(),
  ]);
  const popularCats = [...cats].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-x py-12 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Co hledáte?</h1>
            <p className="mt-3 text-muted sm:text-lg">Inzeráty z celé České republiky. Vložení zdarma.</p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl"><SearchBox size="lg" /></div>
          <div className="mx-auto mt-4 flex max-w-2xl justify-start gap-2 overflow-x-auto scrollbar-none pb-1 sm:justify-center">
            {POPULAR.map((p) => <Link key={p} href={`/hledat?q=${encodeURIComponent(p)}&chytre=1`} className="chip shrink-0">{p}</Link>)}
          </div>
        </div>
      </section>

      <Section id="kat" title="Kategorie">
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5 lg:grid-cols-10">
          {cats.map((c) => (
            <Link key={c.slug} href={`/kategorie/${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
              <CategoryTile slug={c.slug} icon={c.icon} variant={variant} />
              <span className="text-[12.5px] leading-tight text-ink-2 group-hover:text-ink">{c.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      {featured.length > 0 && (
        <Section id="dop" title="Doporučené nabídky" href="/hledat">
          <ListingGrid items={featured} />
        </Section>
      )}

      <Section id="nove" title="Nejnovější nabídky" href="/hledat?razeni=newest">
        {latest.length ? <ListingGrid items={latest} /> : <p className="card p-8 text-center text-muted">Zatím tu nejsou žádné inzeráty. Buďte první.</p>}
      </Section>

      {popularCats.length > 0 && (
        <Section id="obl" title="Oblíbené kategorie">
          <div className="flex flex-wrap gap-2">
            {popularCats.map((c) => <Link key={c.slug} href={`/kategorie/${c.slug}`} className="chip">{c.name}<span className="text-muted">{c.count}</span></Link>)}
          </div>
        </Section>
      )}

      <section className="container-x pt-16">
        <div className="card flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Máte něco na prodej?</h2>
            <p className="mt-1 text-muted">Inzerát vložíte do minuty. {me ? '' : 'Stačí se zaregistrovat e-mailem nebo přes Google.'}</p>
          </div>
          <div className="flex gap-2">
            {!me && <Link href="/registrace" className="btn btn-outline">Registrovat</Link>}
            <Link href="/pridat" className="btn btn-primary"><Plus className="size-4" strokeWidth={2.5} />Přidat inzerát</Link>
          </div>
        </div>
      </section>
    </>
  );
}
