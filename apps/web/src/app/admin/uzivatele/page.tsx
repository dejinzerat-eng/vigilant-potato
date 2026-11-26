import { UsersTable } from '@/components/admin/tables';
import { api } from '@/lib/api';
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="h-display text-3xl font-bold">Uživatelé</h1><form><input name="q" defaultValue={q} placeholder="Hledat e-mail nebo jméno" className="input h-9 w-64 text-sm" /></form></div><UsersTable rows={await api(`/admin/users?q=${encodeURIComponent(q)}`)} /></div>;
}
