'use client';
import { UserCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call } from '@/lib/client';

export function FollowButton({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial); const router = useRouter();
  return (
    <button onClick={async () => { try { await call(`/users/${id}/follow`, on ? 'DELETE' : 'POST'); setOn(!on); } catch { router.push('/prihlaseni'); } }} className={`btn ${on ? 'btn-outline' : 'btn-dark'}`}>
      {on ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}{on ? 'Sledujete' : 'Sledovat'}
    </button>
  );
}
