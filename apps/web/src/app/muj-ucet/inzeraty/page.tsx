import { MyListings } from '@/components/my-listings';
import { api } from '@/lib/api';
export const metadata = { title: 'Moje inzeráty', robots: { index: false } };
export default async function Page() {
  return <MyListings items={await api('/me/listings')} />;
}
