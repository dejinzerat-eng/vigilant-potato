import { Suspense } from 'react';
import { ModerationList } from '@/components/admin/moderation';
import { api } from '@/lib/api';
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = 'PENDING', q = '' } = await searchParams;
  const rows = await api<any[]>(`/admin/listings?status=${status}&q=${encodeURIComponent(q)}`);
  return <div><h1 className="h-display mb-5 text-3xl font-bold">Inzeráty</h1><Suspense><ModerationList rows={rows} /></Suspense></div>;
}
