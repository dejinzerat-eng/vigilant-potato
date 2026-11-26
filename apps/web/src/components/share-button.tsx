'use client';
import { Share2 } from 'lucide-react';
import { useToast } from './toast';

export function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  async function share() {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title, url }); } catch { /* zrušeno */ } return; }
    await navigator.clipboard.writeText(url); toast('Odkaz zkopírován');
  }
  return <button onClick={share} className="btn btn-outline"><Share2 className="size-5" />Sdílet</button>;
}
