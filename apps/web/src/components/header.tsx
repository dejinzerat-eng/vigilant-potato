import Link from 'next/link';
import { Heart, MessageCircle, Plus, Shield, User } from 'lucide-react';
import type { Me } from '@/lib/api';
import { Logo } from './logo';
import { HeaderSearch } from './header-search';
import { UserMenu } from './user-menu';

export function Header({ me }: { me: Me | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center gap-3 md:gap-6">
        <Logo />
        <HeaderSearch />
        <nav className="ml-auto flex items-center gap-1" aria-label="Hlavní">
          {me && me.role !== 'USER' && <Link href="/admin" className="btn btn-ghost btn-sm hidden lg:inline-flex"><Shield className="size-4" />Administrace</Link>}
          <Link href="/muj-ucet/oblibene" className="btn btn-ghost btn-sm hidden md:inline-flex" aria-label="Oblíbené"><Heart className="size-[18px]" /></Link>
          <Link href="/zpravy" className="btn btn-ghost btn-sm relative hidden md:inline-flex" aria-label="Zprávy">
            <MessageCircle className="size-[18px]" />
            {!!me?.unreadMessages && <span className="absolute right-1 top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{me.unreadMessages}</span>}
          </Link>
          {me ? <UserMenu me={me} /> : <Link href="/prihlaseni" className="btn btn-ghost btn-sm"><User className="size-[18px]" /><span className="hidden sm:inline">Přihlásit</span></Link>}
          <Link href="/pridat" className="btn btn-primary btn-sm ml-1 hidden sm:inline-flex"><Plus className="size-4" strokeWidth={2.5} />Přidat inzerát</Link>
        </nav>
      </div>
      <HeaderSearch mobile />
    </header>
  );
}
