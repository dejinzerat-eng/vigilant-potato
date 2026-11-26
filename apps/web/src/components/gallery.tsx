'use client';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function Gallery({ images, title }: { images: { url: string; thumbUrl: string }[]; title: string }) {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [full, go]);
  if (!n) return <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-surface-2 text-muted">Bez fotografií</div>;

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { touch.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; },
  };
  const Nav = ({ dark }: { dark?: boolean }) => n > 1 ? (
    <>
      <button onClick={() => go(-1)} aria-label="Předchozí fotka" className={`absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full ${dark ? 'bg-white/15 text-white' : 'bg-surface/90 shadow-card'}`}><ChevronLeft className="size-5" /></button>
      <button onClick={() => go(1)} aria-label="Další fotka" className={`absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full ${dark ? 'bg-white/15 text-white' : 'bg-surface/90 shadow-card'}`}><ChevronRight className="size-5" /></button>
    </>
  ) : null;

  return (
    <div>
      <div className="relative -mx-4 overflow-hidden bg-surface-2 sm:mx-0 sm:rounded-3xl" {...swipe}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i].url} alt={`${title} – fotka ${i + 1} z ${n}`} className="aspect-[4/3] w-full cursor-zoom-in object-cover" onClick={() => setFull(true)} />
        <Nav />
        <button onClick={() => setFull(true)} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur"><Expand className="size-4" />{i + 1} / {n}</button>
      </div>
      {n > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((im, j) => (
            <button key={im.url} onClick={() => setI(j)} aria-label={`Fotka ${j + 1}`} className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${j === i ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumbUrl} alt="" className="h-16 w-20 object-cover sm:h-20 sm:w-28" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {full && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label="Galerie" {...swipe}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[i].url} alt="" className="max-h-full max-w-full object-contain" />
          <Nav dark />
          <button onClick={() => setFull(false)} className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Zavřít"><X className="size-6" /></button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/80">{i + 1} / {n}</div>
        </div>
      )}
    </div>
  );
}
