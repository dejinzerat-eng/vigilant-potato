import 'server-only';
import { cookies } from 'next/headers';

const API = process.env.API_INTERNAL_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api` : 'http://localhost:4000');

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Volání API ze serverových komponent – přeposílá cookie přihlášení. */
export async function api<T>(path: string, init: RequestInit & { revalidate?: number; auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.auth !== false) {
    const c = await cookies();
    const s = c.get('dej_session');
    if (s) headers.set('cookie', `dej_session=${s.value}`);
  }
  const r = await fetch(`${API}${path}`, { ...init, headers, cache: init.revalidate ? 'force-cache' : 'no-store', next: init.revalidate ? { revalidate: init.revalidate } : undefined });
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).message ?? msg; } catch { /* */ }
    throw new ApiError(r.status, msg);
  }
  return r.json() as Promise<T>;
}

export async function getMe() {
  try { return (await api<{ user: Me | null }>('/auth/me')).user; } catch { return null; }
}

export interface Me {
  id: string; email: string; name: string; role: 'USER' | 'MODERATOR' | 'ADMIN'; phone: string | null; avatarUrl: string | null;
  city: string | null; bio: string | null; isBusiness: boolean; companyName: string | null; companyId: string | null;
  emailVerifiedAt: string | null; phoneVerifiedAt: string | null; createdAt: string; hasPassword: boolean; unreadMessages: number; unreadNotifications: number;
}
