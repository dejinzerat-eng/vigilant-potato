'use client';
import Link from 'next/link';
import { Bell, ChevronDown, Heart, LayoutList, LogOut, Search, Settings, Shield, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Me } from '@/lib/api';
import { Avatar } from './avatar';

export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/'; }
  const items = [
    { href: '/muj-ucet/inzeraty', label: 'Moje inzeráty', icon: LayoutList },
    { href: '/muj-ucet/oblibene', label: 'Oblíbené', icon: Heart },
    { href: '/muj-ucet/hledani', label: 'Uložená hledání', icon: Search },
    { href: '/muj-ucet/sledovani', label: 'Sledovaní prodejci', icon: Users },
    { href: '/muj-ucet/upozorneni', label: 'Upozornění', icon: Bell, badge: me.unreadNotifications },
    { href: '/muj-ucet/nastaveni', label: 'Nastavení účtu', icon: Settings },
    ...(me.role !== 'USER' ? [{ href: '/admin', label: 'Administrace', icon: Shield }] : []),
  ];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost btn-sm relative pl-1.5" aria-expanded={open} aria-haspopup="menu">
        <Avatar name={me.name} url={me.avatarUrl} size={28} />
        <span className="hidden max-w-28 truncate lg:inline">{me.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 text-muted" />
        {!!me.unreadNotifications && <span className="absolute left-6 top-1 size-2.5 rounded-full bg-brand ring-2 ring-paper" />}
      </button>
      {open && (
        <div role="menu" className="animate-fade-up absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-pop">
          <div className="px-4 py-2.5 border-b border-line mb-1">
            <div className="font-semibold truncate">{me.name}</div>
            <div className="text-sm text-muted truncate">{me.email}</div>
          </div>
          {items.map((i) => (
            <Link key={i.href} href={i.href} onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-surface-2">
              <i.icon className="size-[18px] text-muted" />{i.label}
              {!!i.badge && <span className="ml-auto rounded-full bg-brand px-1.5 text-xs font-bold text-white">{i.badge}</span>}
            </Link>
          ))}
          <button onClick={logout} role="menuitem" className="mt-1 flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-[15px] hover:bg-surface-2"><LogOut className="size-[18px] text-muted" />Odhlásit se</button>
        </div>
      )}
    </div>
  );
}
