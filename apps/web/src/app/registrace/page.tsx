import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth-forms';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = { title: 'Registrace', robots: { index: false } };

export default function Page() {
  return <AuthShell title="Registrace" subtitle="Inzerujte zdarma a ukládejte si oblíbené nabídky."><Suspense><RegisterForm /></Suspense></AuthShell>;
}
