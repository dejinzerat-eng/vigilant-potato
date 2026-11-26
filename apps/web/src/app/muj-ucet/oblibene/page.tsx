import Link from 'next/link';
import { ListingGrid } from '@/components/listing-card';
import { api } from '@/lib/api';
import type { ListingCard } from '@/lib/types';
export const metadata = { title: 'Oblíbené', robots: { index: false } };
export default async function Page() {
  const items = await api<ListingCard[]>('/me/favorites');
  return (
    <div>
      <h1 className="h-display mb-5 text-3xl font-bold">Oblíbené inzeráty</h1>
      {items.length ? <ListingGrid items={items} favorites={new Set(items.map((i) => i.id))} /> : <div className="card p-12 text-center text-muted">Srdíčkem u inzerátu si ho uložíte sem. <Link href="/hledat" className="font-semibold text-brand-ink">Prohlížet inzeráty</Link></div>}
    </div>
  );
}
