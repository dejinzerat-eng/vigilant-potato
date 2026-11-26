import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import { api } from '@/lib/api';

export const metadata = { title: 'Ověření e-mailu', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = await api(`/auth/verify-email?token=${encodeURIComponent(token ?? '')}`, { auth: false }).then(() => true).catch(() => false);
  return (
    <AuthShell title={ok ? 'E-mail ověřen' : 'Odkaz nefunguje'}>
      <div className="flex flex-col items-center gap-4 text-center">
        {ok ? <CheckCircle2 className="size-12 text-trust" /> : <XCircle className="size-12 text-danger" />}
        <p className="text-ink-2">{ok ? 'Děkujeme, váš e-mail je ověřený.' : 'Odkaz je neplatný nebo vypršel. Nový si můžete poslat v nastavení účtu.'}</p>
        <Link href={ok ? '/' : '/muj-ucet/nastaveni'} className="btn btn-primary">{ok ? 'Pokračovat' : 'Nastavení účtu'}</Link>
      </div>
    </AuthShell>
  );
}
