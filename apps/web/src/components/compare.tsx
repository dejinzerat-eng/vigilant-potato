'use client';
import Link from 'next/link';
import { Columns3, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const KEY = 'dej_compare';
const EVT = 'dej-compare';
export function readCompare(): string[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } }
function write(ids: string[]) { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* */ } window.dispatchEvent(new Event(EVT)); }

function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { const u = () => setIds(readCompare()); u(); window.addEventListener(EVT, u); return () => window.removeEventListener(EVT, u); }, []);
  return ids;
}

export function CompareToggle({ id }: { id: string }) {
  const ids = useCompare();
  const on = ids.includes(id);
  return (
    <button className="btn btn-outline" aria-pressed={on} onClick={() => write(on ? ids.filter((x) => x !== id) : [...ids.filter((x) => x !== id), id].slice(-4))}>
      <Columns3 className="size-5" />{on ? 'V porovnání' : 'Porovnat'}
    </button>
  );
}

export function CompareBar() {
  const ids = useCompare();
  if (ids.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
      <div className="animate-fade-up flex items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-paper shadow-pop">
        <Columns3 className="size-5" />
        <span className="text-sm font-medium">{ids.length} {ids.length === 1 ? 'inzerát' : 'inzeráty'} k porovnání</span>
        <Link href={`/porovnani?ids=${ids.join(',')}`} className="btn btn-primary btn-sm">Porovnat</Link>
        <button onClick={() => write([])} className="grid size-8 place-items-center rounded-full hover:bg-white/10" aria-label="Vyprázdnit porovnání"><X className="size-4" /></button>
      </div>
    </div>
  );
}

export function CompareRemove({ id }: { id: string }) {
  return <button onClick={() => { write(readCompare().filter((x) => x !== id)); location.href = `/porovnani?ids=${readCompare().join(',')}`; }} className="text-sm text-muted hover:text-danger">Odebrat</button>;
}
