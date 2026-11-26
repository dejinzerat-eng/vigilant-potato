'use client';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Přepínač světlého/tmavého režimu. Výchozí je světlý; volba se pamatuje v prohlížeči. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('dej_theme', next ? 'dark' : 'light'); } catch { /* */ }
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex items-center gap-1.5 hover:text-ink" aria-pressed={dark}>
      {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}{dark ? 'Světlý režim' : 'Tmavý režim'}
    </button>
  );
}
