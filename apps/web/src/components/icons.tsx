import { Baby, Bike, BookOpen, Palette, Wheat, Briefcase, Car, Drill, Flower2, Gem, House, Laptop, Music, PawPrint, Shapes, Shirt, Smartphone, Sofa, Tv, Wrench, type LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = { car: Car, house: House, tv: Tv, smartphone: Smartphone, laptop: Laptop, sofa: Sofa, flower: Flower2, shirt: Shirt, baby: Baby, bike: Bike, 'paw-print': PawPrint, briefcase: Briefcase, wrench: Wrench, drill: Drill, music: Music, gem: Gem, shapes: Shapes, 'book-open': BookOpen, palette: Palette, wheat: Wheat };

export function CategoryIcon({ name, className, strokeWidth = 1.75 }: { name: string; className?: string; strokeWidth?: number }) {
  const I = MAP[name] ?? Shapes;
  return <I className={className} strokeWidth={strokeWidth} aria-hidden />;
}

/** Barva každé kategorie (odstín pro dlaždici ikony). */
const HUES: Record<string, [string, string]> = {
  'auto-moto': ['#2563eb', '#60a5fa'], reality: ['#0e9f6e', '#34d399'], elektronika: ['#7c3aed', '#a78bfa'], mobily: ['#0891b2', '#22d3ee'],
  pocitace: ['#4f46e5', '#818cf8'], nabytek: ['#b45309', '#f59e0b'], 'dum-zahrada': ['#15803d', '#4ade80'], obleceni: ['#db2777', '#f472b6'],
  deti: ['#ea580c', '#fb923c'], sport: ['#dc2626', '#f87171'], zvirata: ['#a16207', '#facc15'], prace: ['#334155', '#64748b'],
  sluzby: ['#0f766e', '#2dd4bf'], 'stroje-naradi': ['#c2410c', '#fb923c'], hudba: ['#9333ea', '#c084fc'], sberatelstvi: ['#a16207', '#fbbf24'],
  knihy: ['#1d4ed8', '#93c5fd'], hobby: ['#be185d', '#f9a8d4'], potraviny: ['#65a30d', '#a3e635'], ostatni: ['#475569', '#94a3b8'],
};

/** Barevná dlaždice kategorie. Varianta „soft“: pastelové pozadí a barevná ikona; „solid“: barevný přechod a bílá ikona. */
export function CategoryTile({ slug, icon, variant = 'soft', className = 'size-14' }: { slug: string; icon: string; variant?: 'soft' | 'solid'; className?: string }) {
  const [c1, c2] = HUES[slug] ?? ['#475569', '#94a3b8'];
  const style = variant === 'solid'
    ? { background: `linear-gradient(145deg, ${c2}, ${c1})`, color: '#fff', boxShadow: `0 6px 16px -6px ${c1}99` }
    : { background: `color-mix(in srgb, ${c2} 16%, var(--surface))`, color: c1 };
  return (
    <span className={`grid place-items-center rounded-2xl transition-transform group-hover:-translate-y-0.5 ${className}`} style={style}>
      <CategoryIcon name={icon} className="size-[26px]" strokeWidth={variant === 'solid' ? 2 : 1.9} />
    </span>
  );
}
