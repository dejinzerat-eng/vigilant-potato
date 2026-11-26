'use client';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';
import { useToast } from './toast';

export function FavoriteButton({ id, initial = false, className = '', large }: { id: string; initial?: boolean; className?: string; large?: boolean }) {
  const [on, setOn] = useState(initial);
  const router = useRouter();
  const toast = useToast();
  async function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const next = !on; setOn(next);
    try {
      await call(`/listings/${id}/favorite`, next ? 'POST' : 'DELETE');
      toast(next ? 'Uloženo do oblíbených' : 'Odebráno z oblíbených');
    } catch (err) {
      setOn(!next);
      if ((err as Error).message.includes('přihlásit')) router.push(`/prihlaseni?zpet=${encodeURIComponent(location.pathname)}`);
      else toast((err as Error).message, 'error');
    }
  }
  if (large) return (
    <button onClick={toggle} className={`btn btn-outline ${className}`} aria-pressed={on}>
      <Heart className={`size-5 ${on ? 'fill-brand text-brand' : ''}`} />{on ? 'V oblíbených' : 'Uložit'}
    </button>
  );
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
      className={`grid size-9 place-items-center rounded-full bg-surface/90 backdrop-blur shadow-card transition hover:scale-105 ${className}`}>
      <Heart className={`size-[18px] ${on ? 'fill-brand text-brand' : 'text-ink-2'}`} />
    </button>
  );
}
