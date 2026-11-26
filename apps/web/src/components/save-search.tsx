'use client';
import { BellPlus, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SearchParams } from '@dej/shared';
import { call } from '@/lib/client';
import { useToast } from './toast';

export function SaveSearch({ params, label }: { params: SearchParams; label: string }) {
  const [saved, setSaved] = useState(false);
  const toast = useToast(); const router = useRouter();
  async function save() {
    try {
      const { page: _p, sort: _s, ...query } = params;
      await call('/me/saved-searches', 'POST', { name: label, query, notify: true });
      setSaved(true); toast('Hledání uloženo. Pošleme vám upozornění na nové inzeráty.');
    } catch (e) {
      if ((e as Error).message.includes('přihlásit')) router.push(`/prihlaseni?zpet=${encodeURIComponent(location.pathname + location.search)}`);
      else toast((e as Error).message, 'error');
    }
  }
  return (
    <button onClick={save} disabled={saved} className="btn btn-outline btn-sm">
      {saved ? <BellRing className="size-4 text-brand" /> : <BellPlus className="size-4" />}{saved ? 'Hlídáme za vás' : 'Hlídat nové inzeráty'}
    </button>
  );
}
