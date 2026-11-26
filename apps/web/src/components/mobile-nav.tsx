'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, MessageCircle, Plus, User } from 'lucide-react';

export function MobileNav({ unread = 0, loggedIn }: { unread?: number; loggedIn: boolean }) {
  const path = usePathname()!;
  const items = [
    { href: '/', label: 'Domů', icon: Home },
    { href: '/muj-ucet/oblibene', label: 'Oblíbené', icon: Heart },
    { href: '/pridat', label: 'Přidat', icon: Plus, primary: true },
    { href: '/zpravy', label: 'Zprávy', icon: MessageCircle, badge: unread },
    { href: loggedIn ? '/muj-ucet/inzeraty' : '/prihlaseni', label: 'Účet', icon: User },
  ];
  if (path.startsWith('/zpravy/') || path.startsWith('/pridat') || path.includes('/upravit')) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Mobilní navigace">
      <ul className="grid grid-cols-5">
        {items.map((i) => {
          const active = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-ink' : 'text-muted'}`}>
                {i.primary ? <span className="grid size-10 place-items-center rounded-2xl bg-brand text-white"><i.icon className="size-5" strokeWidth={2.5} /></span> : <i.icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />}
                {!i.primary && i.label}
                {!!i.badge && <span className="absolute left-1/2 top-2 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{i.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
