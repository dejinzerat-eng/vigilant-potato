import { notFound, redirect } from 'next/navigation';
import { ListingWizard, type WizardInitial } from '@/components/listing-wizard';
import { api, getMe } from '@/lib/api';

export const metadata = { title: 'Upravit inzerát', robots: { index: false } };

interface EditData { id: string; title: string; description: string; price: number | null; priceNegotiable: boolean; currency: 'CZK' | 'EUR'; condition: string | null; offerType: string; city: string; zip: string | null; attributes: Record<string, unknown>; videoUrl: string | null; status: string; images: { id: string; url: string; thumbUrl: string }[]; category: { slug: string; parent: { slug: string } | null } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getMe())) redirect(`/prihlaseni?zpet=/inzerat/${id}/upravit`);
  const l = await api<EditData>(`/listings/${id}/edit`).catch(() => notFound());
  const initial: WizardInitial = {
    id: l.id, title: l.title, description: l.description, price: l.price, priceNegotiable: l.priceNegotiable, currency: l.currency, condition: l.condition, offerType: l.offerType,
    city: l.city, zip: l.zip ?? '', attributes: l.attributes, videoUrl: l.videoUrl ?? '', status: l.status, images: l.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl })),
    categorySlug: l.category.parent?.slug ?? '', subSlug: l.category.slug,
  };
  return <div className="container-x py-8"><ListingWizard initial={initial} /></div>;
}
