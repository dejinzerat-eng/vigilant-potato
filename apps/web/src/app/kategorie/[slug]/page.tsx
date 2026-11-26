import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SearchView } from '@/components/search-view';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function cat(slug: string) {
  const cats = await api<Category[]>('/categories', { revalidate: 60, auth: false });
  return cats.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await cat((await params).slug);
  if (!c) return {};
  return { title: { absolute: c.seoTitle ?? `${c.name} | Dejinzerat.cz` }, description: c.seoDescription, alternates: { canonical: `/kategorie/${c.slug}` } };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!(await cat(slug))) notFound();
  return <SearchView searchParams={await searchParams} category={slug} basePath={`/kategorie/${slug}`} />;
}
