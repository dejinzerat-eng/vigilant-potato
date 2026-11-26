import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SearchView } from '@/components/search-view';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

type Props = { params: Promise<{ slug: string; sub: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function find(slug: string, sub: string) {
  const cats = await api<Category[]>('/categories', { revalidate: 60, auth: false });
  return cats.find((c) => c.slug === slug)?.children.find((s) => s.slug === sub);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sub } = await params;
  const s = await find(slug, sub);
  if (!s) return {};
  return { title: { absolute: s.seoTitle ?? `${s.name} | Dejinzerat.cz` }, description: s.seoDescription, alternates: { canonical: `/kategorie/${slug}/${sub}` } };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug, sub } = await params;
  if (!(await find(slug, sub))) notFound();
  return <SearchView searchParams={await searchParams} category={slug} sub={sub} basePath={`/kategorie/${slug}/${sub}`} />;
}
