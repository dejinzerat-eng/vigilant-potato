import Link from 'next/link';

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path d="M9.5 10.5c0-1.1.9-2 2-2h9a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-5.2l-3.6 3.1c-.5.4-1.2.1-1.2-.6v-2.5a2 2 0 0 1-1-1.7z" fill="#fff" />
      <circle cx="19.2" cy="12.3" r="1.5" fill="var(--brand)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Dejinzerat.cz – úvodní stránka">
      <LogoMark />
      <span className="h-display text-[21px] font-bold leading-none tracking-tight">
        <span className="text-brand">dej</span>inzerat<span className="text-muted font-semibold">.cz</span>
      </span>
    </Link>
  );
}
