import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ForgotForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = { title: 'Zapomenuté heslo', robots: { index: false } };

export default function Page() {
  return <AuthShell title="Zapomenuté heslo" subtitle="Pošleme vám odkaz pro nastavení nového hesla."><Suspense><ForgotForm /></Suspense></AuthShell>;
}
