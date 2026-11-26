import { Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { price } from '@/lib/format';
export const metadata = { title: 'Ceník a zvýhodnění inzerátů' };
type Item = { code: string; name: string; description: string | null; priceCzk: number; durationDays: number | null };
export default async function Page() {
  const items = await api<Item[]>('/prices', { revalidate: 300, auth: false }).catch(() => []);
  return (
    <div className="container-x py-10">
      <h1 className="h-display text-4xl font-bold">Ceník</h1>
      <p className="mt-2 max-w-xl text-lg text-muted">Základní inzerát je vždy zdarma. Chcete prodat rychleji? Zviditelněte svou nabídku.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.code} className="card flex flex-col p-6">
            <Zap className="size-6 text-brand" />
            <h2 className="mt-3 text-lg font-bold">{i.name}</h2>
            <p className="mt-1 flex-1 text-[15px] text-muted">{i.description}</p>
            <div className="mt-4 text-2xl font-bold">{price(i.priceCzk)}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Online platby spouštíme v další fázi. Ceny lze měnit v administraci.</p>
    </div>
  );
}
