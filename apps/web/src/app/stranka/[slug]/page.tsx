import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
type P = { title: string; content: string; updatedAt: string };
const load = (slug: string) => api<P>(`/pages/${slug}`, { revalidate: 300, auth: false }).catch(() => notFound());
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { return { title: (await load((await params).slug)).title }; }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  return (
    <article className="container-x max-w-3xl py-10">
      <h1 className="h-display text-4xl font-bold">{p.title}</h1>
      <p className="mt-2 text-sm text-muted">Aktualizováno {new Date(p.updatedAt).toLocaleDateString('cs-CZ')}</p>
      <div className="mt-8 whitespace-pre-line text-[17px] leading-relaxed text-ink-2">{p.content}</div>
    </article>
  );
}
