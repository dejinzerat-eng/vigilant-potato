'use client';
import { BadgeCheck, Download, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CITIES } from '@dej/shared';
import type { Me } from '@/lib/api';
import { call } from '@/lib/client';
import { useToast } from './toast';

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2>{desc && <p className="mt-1 text-sm text-muted">{desc}</p>}<div className="mt-5">{children}</div></section>;
}

export function Settings({ me, blocked, welcome }: { me: Me; blocked: { id: string; name: string }[]; welcome?: boolean }) {
  const router = useRouter(); const toast = useToast();
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); router.refresh(); return true; } catch (e) { toast((e as Error).message, 'error'); return false; } };
  const [p, setP] = useState({ name: me.name, bio: me.bio ?? '', city: me.city ?? '', isBusiness: me.isBusiness, companyName: me.companyName ?? '', companyId: me.companyId ?? '' });
  const [phone, setPhone] = useState(me.phone ?? '');
  const [codeSent, setCodeSent] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ current: '', password: '' });

  return (
    <div className="space-y-5">
      <h1 className="h-display text-3xl font-bold">Nastavení účtu</h1>
      {welcome && <div className="rounded-2xl bg-trust-soft p-4 text-trust">Vítejte na Dejinzerat.cz! Poslali jsme vám e-mail k ověření adresy. Ověřte si také telefon – získáte odznak <b>Ověřený prodejce</b>.</div>}

      <Section title="Ověření" desc="Ověření prodejci mají u inzerátů zelený odznak a kupující jim víc důvěřují.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Mail className="size-5 text-muted" /><span className="flex-1">{me.email}</span>
            {me.emailVerifiedAt ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-trust"><BadgeCheck className="size-4" />Ověřeno</span>
              : <button onClick={() => run(() => call('/auth/resend-verification', 'POST'), 'Ověřovací e-mail odeslán')} className="btn btn-outline btn-sm">Poslat ověřovací e-mail</button>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Phone className="size-5 text-muted" />
            {me.phoneVerifiedAt ? <><span className="flex-1">{me.phone}</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-trust"><BadgeCheck className="size-4" />Ověřeno</span></> : (
              <div className="flex flex-1 flex-wrap gap-2">
                <input className="input max-w-56" inputMode="tel" placeholder="+420 777 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Telefon" />
                <button onClick={async () => { try { const r = await call<{ devCode?: string }>('/auth/phone/send', 'POST', { phone }); setCodeSent(r.devCode ?? ''); toast('Poslali jsme vám SMS s kódem'); } catch (e) { toast((e as Error).message, 'error'); } }} className="btn btn-outline btn-sm h-11">Poslat kód</button>
              </div>
            )}
          </div>
          {codeSent !== null && !me.phoneVerifiedAt && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3">
              <input className="input max-w-40 tracking-[0.3em]" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Kód z SMS" />
              <button onClick={() => run(() => call('/auth/phone/verify', 'POST', { code }), 'Telefon ověřen')} className="btn btn-dark btn-sm h-11">Ověřit</button>
              {codeSent && <span className="text-xs text-muted">Testovací režim: kód {codeSent}</span>}
            </div>
          )}
        </div>
      </Section>

      <Section title="Profil">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => call('/me', 'PATCH', { ...p, companyId: p.companyId || '' }), 'Profil uložen'); }}>
          <div><label className="label" htmlFor="n">Jméno</label><input id="n" className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div><label className="label" htmlFor="c">Lokalita</label><input id="c" list="cities2" className="input" value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /><datalist id="cities2">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="b">O mně</label><textarea id="b" className="input" rows={3} maxLength={600} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} /></div>
          <label className="flex items-center gap-3 sm:col-span-2"><input type="checkbox" className="size-5 accent-[var(--brand)]" checked={p.isBusiness} onChange={(e) => setP({ ...p, isBusiness: e.target.checked })} />Prodávám jako firma / podnikatel</label>
          {p.isBusiness && <>
            <div><label className="label" htmlFor="cn">Název firmy</label><input id="cn" className="input" value={p.companyName} onChange={(e) => setP({ ...p, companyName: e.target.value })} /></div>
            <div><label className="label" htmlFor="ci">IČO</label><input id="ci" className="input" inputMode="numeric" maxLength={8} value={p.companyId} onChange={(e) => setP({ ...p, companyId: e.target.value.replace(/\D/g, '') })} /></div>
          </>}
          <div className="sm:col-span-2"><button className="btn btn-dark">Uložit profil</button></div>
        </form>
      </Section>

      <Section title={me.hasPassword ? 'Změna hesla' : 'Nastavit heslo'}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => call('/auth/password/change', 'POST', pw), 'Heslo změněno')) setPw({ current: '', password: '' }); }}>
          {me.hasPassword && <div><label className="label" htmlFor="cp">Současné heslo</label><input id="cp" type="password" autoComplete="current-password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></div>}
          <div><label className="label" htmlFor="np">Nové heslo</label><input id="np" type="password" autoComplete="new-password" minLength={8} className="input" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></div>
          <div className="sm:col-span-2 flex flex-wrap gap-2"><button className="btn btn-dark">Uložit heslo</button>
            <button type="button" onClick={() => run(() => call('/auth/sessions/revoke-all', 'POST'), 'Odhlášeno ze všech zařízení').then(() => (location.href = '/prihlaseni'))} className="btn btn-ghost">Odhlásit ze všech zařízení</button></div>
        </form>
      </Section>

      {blocked.length > 0 && (
        <Section title="Zablokovaní uživatelé">
          <ul className="divide-y divide-line">{blocked.map((b) => <li key={b.id} className="flex items-center justify-between py-2.5"><span>{b.name}</span><button onClick={() => run(() => call(`/users/${b.id}/unblock`, 'POST'), 'Odblokováno')} className="btn btn-outline btn-sm">Odblokovat</button></li>)}</ul>
        </Section>
      )}

      <Section title="Osobní údaje (GDPR)" desc="Kdykoli si můžete stáhnout všechna svá data nebo účet smazat.">
        <div className="flex flex-wrap gap-2">
          <a href="/api/me/export" download="dejinzerat-moje-data.json" className="btn btn-outline"><Download className="size-4" />Stáhnout moje data</a>
          <button onClick={() => { if (confirm('Opravdu smazat účet? Všechny inzeráty budou odstraněny a akci nelze vrátit.')) run(() => call('/me', 'DELETE'), 'Účet smazán').then(() => (location.href = '/')); }} className="btn btn-danger">Smazat účet</button>
        </div>
      </Section>
    </div>
  );
}
