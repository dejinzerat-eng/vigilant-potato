'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { call } from '@/lib/client';

function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return { error, busy, run };
}

const safeBack = (z: string | null) => (z && z.startsWith('/') && !z.startsWith('//') ? z : '/');

function SocialButtons() {
  const [p, setP] = useState<{ google?: boolean; apple?: boolean }>({});
  useEffect(() => { fetch('/api/auth/providers').then((r) => r.json()).then(setP).catch(() => {}); }, []);
  if (!p.google && !p.apple) return null;
  return (
    <div data-social className="space-y-2.5">
      {p.google && (
        <a href="/api/auth/google" className="btn btn-outline w-full">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.3-4.7 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.8 0-5.3-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.9 14a6.6 6.6 0 0 1 0-4.1V7.1H2.2a11 11 0 0 0 0 9.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1L5.9 10c.8-2.6 3.3-4.6 6.1-4.6z" /></svg>
          Pokračovat přes Google
        </a>
      )}
      {p.apple && (
        <a href="/api/auth/apple" className="btn btn-outline w-full">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9c-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" /></svg>
          Pokračovat přes Apple
        </a>
      )}
    </div>
  );
}

function Divider() {
  return <div className="hidden [[data-social]+&]:flex my-5 items-center gap-3 text-xs uppercase tracking-wide text-muted"><span className="h-px flex-1 bg-line" />nebo e-mailem<span className="h-px flex-1 bg-line" /></div>;
}
function ErrorBox({ error }: { error: string | null }) {
  return error ? <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">{error}</p> : null;
}

export function LoginForm() {
  const sp = useSearchParams()!;
  const { error, busy, run } = useSubmit();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  return (
    <>
      <SocialButtons />
      <Divider />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await call('/auth/login', 'POST', { email, password }); location.href = safeBack(sp.get('zpet')); }); }}>
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <div className="flex justify-between"><label className="label" htmlFor="pw">Heslo</label><Link href="/zapomenute-heslo" className="text-sm font-medium text-brand-ink hover:underline">Zapomenuté heslo?</Link></div>
          <input id="pw" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <ErrorBox error={error ?? (sp.get('chyba') === 'google' ? 'Přihlášení přes Google zatím není nastavené.' : sp.get('chyba') === 'apple' ? 'Přihlášení přes Apple zatím není nastavené.' : null)} />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Přihlašuji…' : 'Přihlásit se'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Nemáte účet? <Link href={`/registrace${sp.get('zpet') ? `?zpet=${encodeURIComponent(sp.get('zpet')!)}` : ''}`} className="font-semibold text-brand-ink hover:underline">Zaregistrujte se zdarma</Link></p>
    </>
  );
}

export function RegisterForm() {
  const sp = useSearchParams()!;
  const { error, busy, run } = useSubmit();
  const [f, setF] = useState({ name: '', email: '', password: '', terms: false });
  return (
    <>
      <SocialButtons />
      <Divider />
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await call('/auth/register', 'POST', f); location.href = safeBack(sp.get('zpet')) === '/' ? '/muj-ucet/nastaveni?vitejte=1' : safeBack(sp.get('zpet')); }); }}>
        <div><label className="label" htmlFor="name">Jméno</label><input id="name" autoComplete="name" required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="email">E-mail</label><input id="email" type="email" autoComplete="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="label" htmlFor="pw">Heslo</label><input id="pw" type="password" autoComplete="new-password" minLength={8} required className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><p className="mt-1.5 text-xs text-muted">Alespoň 8 znaků.</p></div>
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" className="mt-0.5 size-5 accent-[var(--brand)]" checked={f.terms} onChange={(e) => setF({ ...f, terms: e.target.checked })} required />
          <span>Souhlasím s <Link href="/stranka/podminky" className="underline">podmínkami používání</Link> a beru na vědomí <Link href="/stranka/ochrana-udaju" className="underline">zpracování osobních údajů</Link>.</span>
        </label>
        <ErrorBox error={error} />
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Vytvářím účet…' : 'Vytvořit účet'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Už máte účet? <Link href="/prihlaseni" className="font-semibold text-brand-ink hover:underline">Přihlaste se</Link></p>
    </>
  );
}

export function ForgotForm() {
  const { error, busy, run } = useSubmit();
  const [email, setEmail] = useState(''); const [done, setDone] = useState(false);
  if (done) return <p className="rounded-xl bg-trust-soft p-4 text-[15px] text-trust">Pokud u nás účet s tímto e-mailem existuje, poslali jsme na něj odkaz pro nastavení nového hesla.</p>;
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await call('/auth/password/forgot', 'POST', { email }); setDone(true); }); }}>
      <div><label className="label" htmlFor="email">E-mail</label><input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <ErrorBox error={error} />
      <button className="btn btn-primary w-full" disabled={busy}>Poslat odkaz</button>
    </form>
  );
}

export function ResetForm() {
  const sp = useSearchParams()!; const router = useRouter();
  const { error, busy, run } = useSubmit();
  const [password, setPassword] = useState('');
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await call('/auth/password/reset', 'POST', { token: sp.get('token'), password }); router.push('/prihlaseni'); }); }}>
      <div><label className="label" htmlFor="pw">Nové heslo</label><input id="pw" type="password" autoComplete="new-password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <ErrorBox error={error} />
      <button className="btn btn-primary w-full" disabled={busy}>Nastavit heslo</button>
    </form>
  );
}
