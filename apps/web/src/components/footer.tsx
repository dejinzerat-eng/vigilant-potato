import Link from 'next/link';
import { CATEGORIES } from '@dej/shared';
import { LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.3fr_2fr]">
        <div>
          <div className="flex items-center gap-2"><LogoMark className="size-7" /><span className="h-display text-lg font-bold"><span className="text-brand">dej</span>inzerat.cz</span></div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">Jednoduchá a bezpečná inzerce pro celou Českou republiku.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-sm">
          <div>
            <h3 className="mb-3 font-semibold">Kategorie</h3>
            <ul className="space-y-2 text-muted">{CATEGORIES.slice(0, 6).map((c) => <li key={c.slug}><Link className="hover:text-ink" href={`/kategorie/${c.slug}`}>{c.name}</Link></li>)}</ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Portál</h3>
            <ul className="space-y-2 text-muted">
              <li><Link className="hover:text-ink" href="/pridat">Přidat inzerát</Link></li>
              <li><Link className="hover:text-ink" href="/cenik">Topování a ceník</Link></li>
              <li><Link className="hover:text-ink" href="/stranka/bezpecny-nakup">Bezpečný nákup</Link></li>
              <li><Link className="hover:text-ink" href="/stranka/napoveda">Nápověda</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Právní</h3>
            <ul className="space-y-2 text-muted">
              <li><Link className="hover:text-ink" href="/stranka/podminky">Podmínky používání</Link></li>
              <li><Link className="hover:text-ink" href="/stranka/ochrana-udaju">Ochrana osobních údajů</Link></li>
              <li><Link className="hover:text-ink" href="/stranka/kontakt">Kontakt</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-line"><div className="container-x flex items-center justify-between py-5 text-xs text-muted"><span>© {new Date().getFullYear()} Dejinzerat.cz</span><ThemeToggle /></div></div>
    </footer>
  );
}
