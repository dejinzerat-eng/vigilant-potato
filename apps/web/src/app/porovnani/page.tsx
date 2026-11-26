import Link from 'next/link';
import { filtersFor } from '@dej/shared';
import { CompareRemove } from '@/components/compare';
import { api } from '@/lib/api';
import { ago, CONDITION_LABEL, listingUrl, price } from '@/lib/format';
import type { ListingCard } from '@/lib/types';

export const metadata = { title: 'Porovnání inzerátů', robots: { index: false } };
type Row = ListingCard & { attributes: Record<string, unknown>; publishedAt: string | null };

export default async function Page({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids = '' } = await searchParams;
  const items = ids ? await api<Row[]>(`/compare?ids=${encodeURIComponent(ids)}`, { auth: false }) : [];
  const keys = new Map<string, string>();
  items.forEach((i) => filtersFor(i.parentCategorySlug, i.categorySlug).forEach((f) => keys.set(f.key, f.label)));
  const minPrice = Math.min(...items.map((i) => i.price ?? Infinity));
  const fmt = (v: unknown) => v === undefined || v === '' ? '–' : v === true ? 'Ano' : Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? new Intl.NumberFormat('cs-CZ').format(v) : String(v);
  return (
    <div className="container-x py-8">
      <h1 className="h-display mb-6 text-3xl font-bold">Porovnání inzerátů</h1>
      {items.length < 2 ? <div className="card p-10 text-center text-muted">Vyberte alespoň dva inzeráty tlačítkem „Porovnat“ na detailu inzerátu. <Link href="/hledat" className="font-semibold text-brand-ink">Hledat</Link></div> : (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[15px]">
            <thead><tr><th className="w-40" />{items.map((i) => (
              <th key={i.id} className="p-2 text-left align-top font-normal">
                <Link href={listingUrl(i)} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image && <img src={i.image} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />}
                  <div className="mt-2 line-clamp-2 font-semibold hover:underline">{i.title}</div>
                </Link>
                <CompareRemove id={i.id} />
              </th>
            ))}</tr></thead>
            <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:p-3 [&_th]:border-t [&_th]:border-line [&_th]:p-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted">
              <tr><th>Cena</th>{items.map((i) => <td key={i.id} className={`font-bold ${i.price === minPrice ? 'text-trust' : ''}`}>{price(i.price, i.priceNegotiable)}{i.price === minPrice && <span className="ml-1 text-xs font-medium">nejlevnější</span>}</td>)}</tr>
              <tr><th>Stav</th>{items.map((i) => <td key={i.id}>{i.condition ? CONDITION_LABEL[i.condition] : '–'}</td>)}</tr>
              <tr><th>Lokalita</th>{items.map((i) => <td key={i.id}>{i.city}</td>)}</tr>
              <tr><th>Zveřejněno</th>{items.map((i) => <td key={i.id}>{ago(i.publishedAt ?? i.createdAt)}</td>)}</tr>
              <tr><th>Ověřený prodejce</th>{items.map((i) => <td key={i.id}>{i.verified ? 'Ano' : 'Ne'}</td>)}</tr>
              {[...keys].map(([k, label]) => <tr key={k}><th>{label}</th>{items.map((i) => <td key={i.id}>{fmt(i.attributes?.[k])}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
