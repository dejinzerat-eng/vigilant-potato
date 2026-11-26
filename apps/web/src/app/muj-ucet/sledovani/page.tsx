import { Following } from '@/components/account-lists';
import { api } from '@/lib/api';
export const metadata = { title: 'Sledovaní prodejci', robots: { index: false } };
export default async function Page() {
  return <div><h1 className="h-display mb-5 text-3xl font-bold">Sledovaní prodejci</h1><Following items={await api('/me/following')} /></div>;
}
