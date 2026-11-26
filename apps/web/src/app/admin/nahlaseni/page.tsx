import { Reports } from '@/components/admin/tables';
import { api } from '@/lib/api';
export default async function Page() { return <div><h1 className="h-display mb-5 text-3xl font-bold">Nahlášený obsah</h1><Reports rows={await api('/admin/reports')} /></div>; }
