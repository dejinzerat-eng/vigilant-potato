'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Heart, LayoutList, Search, Settings, Users } from 'lucide-react';

const ITEMS = [
  { href: '/muj-ucet/inzeraty', label: 'Moje inzeráty', icon: LayoutList },
  { href: '/muj-ucet/oblibene', label: 'Oblíbené', icon: Heart },
  { href: '/muj-ucet/hledani', label: 'Uložená hledání', icon: Search },
  { href: '/muj-ucet/sledovani', label: 'Sledovaní prodejci', icon: Users },
  { href: '/muj-ucet/upozorneni', label: 'Upozornění', icon: Bell },
  { href: '/muj-ucet/nastaveni', label: 'Nastavení', icon: Settings },
];

export function AccountNav({ unread }: { unread: number }) {
  const path = usePathname()!;
  return (
    <nav aria-label="Můj účet" className="-mx-4 overflow-x-auto scrollbar-none px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1.5 lg:flex-col">
        {ITEMS.map((i) => {
          const on = path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={on ? 'page' : undefined} className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-surface-2'}`}>
                <i.icon className="size-[18px]" />{i.label}
                {i.href.endsWith('upozorneni') && unread > 0 && <span className="ml-auto rounded-full bg-brand px-1.5 text-xs font-bold text-white">{unread}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
