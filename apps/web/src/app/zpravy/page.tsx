import { ConversationList, type ConvItem } from '@/components/conversation-list';
import { api } from '@/lib/api';
export default async function Page() {
  const items = await api<ConvItem[]>('/conversations');
  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="h-display mb-5 text-3xl font-bold">Zprávy</h1>
      <div className="card overflow-hidden"><ConversationList items={items} /></div>
    </div>
  );
}
