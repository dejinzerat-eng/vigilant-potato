import { redirect } from 'next/navigation';
import { AccountNav } from '@/components/account-nav';
import { getMe } from '@/lib/api';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/prihlaseni?zpet=/muj-ucet/inzeraty');
  return (
    <div className="container-x py-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <AccountNav unread={me.unreadNotifications} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
