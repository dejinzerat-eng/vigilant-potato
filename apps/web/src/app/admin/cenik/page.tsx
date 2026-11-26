import { PricesEditor } from '@/components/admin/tables';
import { api } from '@/lib/api';
export default async function Page() { return <div><h1 className="h-display mb-2 text-3xl font-bold">Ceník služeb</h1><p className="mb-5 text-muted">Ceny topování, zvýraznění a balíčků. Změny se projeví hned, bez zásahu programátora.</p><PricesEditor rows={await api('/admin/prices')} /></div>; }
