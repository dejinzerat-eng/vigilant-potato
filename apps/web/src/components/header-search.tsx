'use client';
import { usePathname } from 'next/navigation';
import { SearchBox } from './search-box';

/** Vyhledávání v hlavičce; na hlavní stránce ho nahrazuje velké pole uprostřed. */
export function HeaderSearch({ mobile }: { mobile?: boolean }) {
  if (usePathname() === '/') return mobile ? null : <div className="hidden flex-1 md:block" />;
  return mobile
    ? <div className="container-x pb-3 md:hidden"><SearchBox /></div>
    : <div className="hidden flex-1 md:block max-w-[640px]"><SearchBox /></div>;
}
