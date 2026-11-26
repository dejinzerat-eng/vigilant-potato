import type { Metadata } from 'next';
import { SearchView } from '@/components/search-view';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: q ? `${q} – hledání` : 'Hledání inzerátů', robots: { index: false, follow: true } };
}

export default async function Page({ searchParams }: Props) {
  return <SearchView searchParams={await searchParams} basePath="/hledat" />;
}
