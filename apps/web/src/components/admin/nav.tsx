'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileText, Flag, History, LayoutList, Tags, Users, Wallet } from 'lucide-react';

export function AdminNav({ role }: { role: string }) {
  const path = usePathname()!;
  const items = [
    { href: '/admin', label: 'Přehled', icon: BarChart3 },
    { href: '/admin/inzeraty', label: 'Inzeráty', icon: LayoutList },
    { href: '/admin/nahlaseni', label: 'Nahlášení', icon: Flag },
    ...(role === 'ADMIN' ? [
      { href: '/admin/uzivatele', label: 'Uživatelé', icon: Users },
      { href: '/admin/kategorie', label: 'Kategorie a SEO', icon: Tags },
      { href: '/admin/cenik', label: 'Ceník služeb', icon: Wallet },
      { href: '/admin/stranky', label: 'Texty a stránky', icon: FileText },
      { href: '/admin/audit', label: 'Auditní log', icon: History },
    ] : []),
  ];
  return (
    <nav aria-label="Administrace" className="-mx-4 overflow-x-auto scrollbar-none px-4 lg:mx-0 lg:px-0">
      <div className="mb-3 hidden text-xs font-bold uppercase tracking-wider text-muted lg:block">Administrace</div>
      <ul className="flex gap-1.5 lg:flex-col">
        {items.map((i) => {
          const on = i.href === '/admin' ? path === '/admin' : path.startsWith(i.href);
          return <li key={i.href}><Link href={i.href} className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[15px] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-surface-2'}`}><i.icon className="size-[18px]" />{i.label}</Link></li>;
        })}
      </ul>
    </nav>
  );
}
