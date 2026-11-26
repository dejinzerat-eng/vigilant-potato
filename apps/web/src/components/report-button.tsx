'use client';
import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';
import { useToast } from './toast';

const REASONS = ['Podvod nebo podezřelý prodejce', 'Zakázané zboží', 'Nevhodný obsah', 'Špatná kategorie', 'Duplicitní inzerát', 'Jiný důvod'];

export function ReportButton({ targetType, targetId, label = 'Nahlásit' }: { targetType: 'LISTING' | 'USER' | 'MESSAGE'; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const toast = useToast(); const router = useRouter();
  async function submit() {
    try { await call('/reports', 'POST', { targetType, targetId, reason, note: note || undefined }); setOpen(false); toast('Děkujeme, moderátoři se na to podívají.'); }
    catch (e) { if ((e as Error).message.includes('přihlásit')) router.push('/prihlaseni'); else toast((e as Error).message, 'error'); }
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger"><Flag className="size-4" />{label}</button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="rep-t">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up relative w-full max-w-md rounded-t-3xl bg-surface p-6 sm:rounded-3xl">
            <h2 id="rep-t" className="text-lg font-bold">Nahlásit</h2>
            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-ink">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--brand)]" />{r}
                </label>
              ))}
            </div>
            <textarea className="input mt-3" rows={3} placeholder="Doplňující informace (nepovinné)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="btn btn-ghost">Zrušit</button>
              <button onClick={submit} className="btn btn-dark">Odeslat</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
