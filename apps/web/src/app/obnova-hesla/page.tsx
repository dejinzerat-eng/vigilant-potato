import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = { title: 'Nové heslo', robots: { index: false } };

export default function Page() {
  return <AuthShell title="Nové heslo" subtitle=""><Suspense><ResetForm /></Suspense></AuthShell>;
}
