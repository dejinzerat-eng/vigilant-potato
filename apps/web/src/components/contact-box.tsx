'use client';
import { Phone, Send, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';
import { useToast } from './toast';

const QUICK = ['Je inzerát ještě aktuální?', 'Byla by možná sleva?', 'Kdy a kde by šlo zboží vyzvednout?', 'Posíláte i poštou / Zásilkovnou?'];

export function ContactBox({ listingId, loggedIn, hasPhone, sellerName }: { listingId: string; loggedIn: boolean; hasPhone: boolean; sellerName: string }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const router = useRouter(); const toast = useToast();
  const login = () => router.push(`/prihlaseni?zpet=${encodeURIComponent(location.pathname)}`);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!loggedIn) return login();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await call<{ conversationId: string }>(`/listings/${listingId}/message`, 'POST', { body });
      router.push(`/zpravy/${r.conversationId}`);
    } catch (err) { toast((err as Error).message, 'error'); setBusy(false); }
  }
  async function reveal() {
    if (!loggedIn) return login();
    try { setPhone((await call<{ phone: string }>(`/listings/${listingId}/phone`)).phone); } catch (err) { toast((err as Error).message, 'error'); }
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {QUICK.map((q) => <button type="button" key={q} onClick={() => setBody(q)} className="chip shrink-0 text-[13px]">{q}</button>)}
      </div>
      <label className="sr-only" htmlFor="msg">Zpráva pro prodejce</label>
      <textarea id="msg" className="input min-h-24" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Napište zprávu – ${sellerName.split(' ')[0]} obvykle odpovídá do pár hodin`} maxLength={4000} />
      <button className="btn btn-primary w-full" disabled={busy}><Send className="size-4" />{loggedIn ? 'Odeslat zprávu' : 'Přihlásit se a napsat'}</button>
      {hasPhone && (phone ? <a href={`tel:${phone.replace(/\s/g, '')}`} className="btn btn-outline w-full"><Phone className="size-4" />{phone}</a>
        : <button type="button" onClick={reveal} className="btn btn-outline w-full"><Phone className="size-4" />Zobrazit telefon</button>)}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted"><ShieldCheck className="mt-px size-4 shrink-0 text-trust" />Nikdy neplaťte předem neznámým prodejcům a neposílejte údaje z karty. Komunikujte přes zprávy Dejinzerat.cz.</p>
    </form>
  );
}
