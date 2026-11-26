import { CategoriesEditor } from '@/components/admin/tables';
import { api } from '@/lib/api';
export default async function Page() { return <div><h1 className="h-display mb-5 text-3xl font-bold">Kategorie a SEO</h1><CategoriesEditor rows={await api('/admin/categories')} /></div>; }
