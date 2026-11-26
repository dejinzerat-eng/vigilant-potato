import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = { title: 'Přihlášení', robots: { index: false } };

export default function Page() {
  return <AuthShell title="Vítejte zpět" subtitle="Přihlaste se ke svému účtu"><Suspense><LoginForm /></Suspense></AuthShell>;
}
