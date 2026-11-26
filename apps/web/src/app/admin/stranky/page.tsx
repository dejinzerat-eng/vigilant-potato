import { PagesEditor } from '@/components/admin/tables';
import { api } from '@/lib/api';
export default async function Page() { return <div><h1 className="h-display mb-5 text-3xl font-bold">Texty a informační stránky</h1><PagesEditor rows={await api('/admin/pages')} /></div>; }
