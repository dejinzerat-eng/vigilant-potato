import { redirect } from 'next/navigation';
import { getMe } from '@/lib/api';
export const metadata = { title: 'Zprávy', robots: { index: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await getMe())) redirect('/prihlaseni?zpet=/zpravy');
  return children;
}
