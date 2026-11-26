import { SavedSearches } from '@/components/account-lists';
import { api } from '@/lib/api';
export const metadata = { title: 'Uložená hledání', robots: { index: false } };
export default async function Page() {
  return <div><h1 className="h-display mb-2 text-3xl font-bold">Uložená hledání</h1><p className="mb-5 text-muted">Jakmile se objeví nový odpovídající inzerát, pošleme vám upozornění a e-mail.</p><SavedSearches items={await api('/me/saved-searches')} /></div>;
}
