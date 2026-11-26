'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'ok' | 'error';
const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; kind: Kind }[]>([]);
  const push = useCallback((msg: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`animate-fade-up rounded-xl px-4 py-2.5 text-sm font-medium shadow-pop ${t.kind === 'error' ? 'bg-danger text-white' : 'bg-ink text-paper'}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
