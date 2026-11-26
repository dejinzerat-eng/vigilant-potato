export const CONDITION_LABEL: Record<string, string> = { NEW: 'Nové', LIKE_NEW: 'Jako nové', USED: 'Použité', DAMAGED: 'Poškozené' };
export const OFFER_LABEL: Record<string, string> = { SELL: 'Prodám', BUY: 'Koupím', EXCHANGE: 'Vyměním', GIVE: 'Daruji', RENT: 'Pronajmu' };
export const STATUS_LABEL: Record<string, string> = { DRAFT: 'Koncept', PENDING: 'Čeká na schválení', ACTIVE: 'Aktivní', RESERVED: 'Rezervováno', SOLD: 'Prodáno', EXPIRED: 'Vypršelo', REJECTED: 'Zamítnuto', DELETED: 'Smazáno' };

export function price(p: number | null | undefined, negotiable = false, currency = 'CZK') {
  if (p == null) return negotiable ? 'Dohodou' : 'Cena v textu';
  if (p === 0) return 'Zdarma';
  return `${new Intl.NumberFormat('cs-CZ').format(p)} ${currency === 'EUR' ? '€' : 'Kč'}`;
}

export function ago(ts: number | string | Date) {
  const d = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const s = (Date.now() - d) / 1000;
  if (s < 60) return 'právě teď';
  if (s < 3600) return `před ${Math.floor(s / 60)} min`;
  if (s < 86400) return `před ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: days > 300 ? 'numeric' : undefined });
}

export function plural(n: number, one: string, few: string, many: string) {
  return `${new Intl.NumberFormat('cs-CZ').format(n)} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
}

export const listingUrl = (l: { id: string; slug: string }) => `/inzerat/${l.id}/${l.slug}`;
