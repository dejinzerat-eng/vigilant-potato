'use client';

/** Volání API z prohlížeče (přes /api proxy na stejné doméně → cookie fungují). */
export async function call<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const r = await fetch(`/api${path}`, {
    method, credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = 'Něco se pokazilo. Zkuste to prosím znovu.';
    try { const j = await r.json(); msg = (Array.isArray(j.message) ? j.message[0] : j.message) ?? msg; } catch { /* */ }
    if (r.status === 429) msg = 'Příliš mnoho požadavků. Chvíli počkejte.';
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}
