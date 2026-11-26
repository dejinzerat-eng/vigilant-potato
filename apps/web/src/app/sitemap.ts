import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@dej/shared';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
const API = process.env.API_INTERNAL_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api` : 'http://localhost:4000');
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cats = CATEGORIES.flatMap((c) => [`/kategorie/${c.slug}`, ...c.children.map((s) => `/kategorie/${c.slug}/${s.slug}`)]);
  let listings: { id: string; slug: string; createdAt: number }[] = [];
  try {
    for (let page = 1; page <= 20; page++) {
      const r = await fetch(`${API}/search?razeni=newest&strana=${page}`, { next: { revalidate: 3600 } }).then((x) => x.json());
      listings = listings.concat(r.hits); if (page >= r.pages) break;
    }
  } catch { /* API nedostupné */ }
  return [
    { url: SITE, changeFrequency: 'hourly', priority: 1 },
    ...cats.map((p) => ({ url: `${SITE}${p}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...listings.map((l) => ({ url: `${SITE}/inzerat/${l.id}/${l.slug}`, lastModified: new Date(l.createdAt), priority: 0.6 })),
  ];
}
