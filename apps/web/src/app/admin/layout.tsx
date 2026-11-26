import { notFound, redirect } from 'next/navigation';
import { AdminNav } from '@/components/admin/nav';
import { getMe } from '@/lib/api';
export const metadata = { title: 'Administrace', robots: { index: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/prihlaseni?zpet=/admin');
  if (me.role === 'USER') notFound();
  return (
    <div className="container-x py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <AdminNav role={me.role} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
