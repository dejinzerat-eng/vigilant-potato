import { Settings } from '@/components/settings';
import { api, getMe } from '@/lib/api';
export const metadata = { title: 'Nastavení účtu', robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ vitejte?: string }> }) {
  const [me, blocked, sp] = await Promise.all([getMe(), api<{ id: string; name: string }[]>('/me/blocked'), searchParams]);
  return <Settings me={me!} blocked={blocked} welcome={sp.vitejte === '1'} />;
}
