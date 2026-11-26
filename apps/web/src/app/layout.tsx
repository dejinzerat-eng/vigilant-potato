import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { ToastProvider } from '@/components/toast';
import { getMe } from '@/lib/api';
import './globals.css';

const body = Onest({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Dejinzerat.cz – moderní inzerce a bazar zdarma', template: '%s | Dejinzerat.cz' },
  description: 'Prodávejte a nakupujte rychle a bezpečně. Inzeráty zdarma z celé České republiky: auta, reality, elektronika, mobily, nábytek, oblečení a další.',
  openGraph: { siteName: 'Dejinzerat.cz', locale: 'cs_CZ', type: 'website' },
  robots: process.env.NOINDEX === '1' ? { index: false, follow: false } : undefined,
};
export const viewport: Viewport = { themeColor: '#f6f7f8' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <html lang="cs" className={body.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('dej_theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}" }} /></head>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>
          <a href="#obsah" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">Přeskočit na obsah</a>
          <Header me={me} />
          <main id="obsah">{children}</main>
          <Footer />
          <MobileNav unread={me?.unreadMessages} loggedIn={!!me} />
        </ToastProvider>
      </body>
    </html>
  );
}
