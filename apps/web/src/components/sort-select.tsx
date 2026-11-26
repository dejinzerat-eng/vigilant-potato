'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function SortSelect({ hasGeo }: { hasGeo: boolean }) {
  const sp = useSearchParams()!; const router = useRouter(); const path = usePathname()!;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Řadit:</span>
      <select className="input h-9 w-auto py-0 text-sm" value={sp.get('razeni') ?? ''} onChange={(e) => {
        const u = new URLSearchParams(sp.toString()); e.target.value ? u.set('razeni', e.target.value) : u.delete('razeni'); u.delete('strana');
        router.push(`${path}?${u}`, { scroll: false });
      }}>
        <option value="">Nejrelevantnější</option>
        <option value="newest">Nejnovější</option>
        <option value="price_asc">Nejlevnější</option>
        <option value="price_desc">Nejdražší</option>
        {hasGeo && <option value="distance">Nejblíže</option>}
      </select>
    </label>
  );
}
