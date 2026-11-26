import { redirect } from 'next/navigation';
import { ListingWizard } from '@/components/listing-wizard';
import { getMe } from '@/lib/api';

export const metadata = { title: 'Přidat inzerát', robots: { index: false } };

export default async function Page() {
  const me = await getMe();
  if (!me) redirect('/prihlaseni?zpet=/pridat');
  return <div className="container-x py-8"><ListingWizard defaultCity={me.city} /></div>;
}
