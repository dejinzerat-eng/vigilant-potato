/**
 * Automatická kontrola obsahu inzerátu (pravidla). Vrací skóre 0–100 a důvody.
 * Fáze 2: doplnit AI klasifikaci (Claude) a detekci duplicitních fotek.
 *
 * JS `\b` zná jen ASCII písmena, takže slova končící diakritikou („zbraň“, „extáz“) se nikdy nenašla.
 * `w` nahradí `\b` hranicí slova, která počítá i česká písmena.
 */
const w = (re: RegExp) => new RegExp(re.source.replace(/\\b/g, '(?:(?<![\\p{L}\\p{N}_])(?=[\\p{L}\\p{N}_])|(?<=[\\p{L}\\p{N}_])(?![\\p{L}\\p{N}_]))'), `${re.flags}u`);

// Zakázané výrazy jsou kmeny slov – na konci nemají hranici slova, aby se chytilo i „pistoli“, „marihuanu“.
// Falešný poplach jen pošle inzerát ke schválení moderátorovi (skóre ≥ 50 → PENDING).
const PROHIBITED = [
  /\b(zbra[nň]|pistol|revolver|samopal|n[aá]boje|munice)/i,
  /\b(drog[ayu]|marihuan|kokain|pervitin|extáz|thc\s?olej)/i,
  /\b(padělek|replika\s+(rolex|louis|gucci)|fake\s+(rolex|nike))/i,
  /\b(občansk[ýá] průkaz|řidičák na prodej|doklady na prodej)/i,
  /\b(eskort|sex\s?služby|erotick[éá] služby)/i,
].map(w);
const SCAM = [
  /\b(western\s?union|moneygram|bitcoin(em)?\s+platb|platba\s+předem\s+na\s+účet\s+v\s+zahraničí)\b/i,
  /\b(pošlu\s+kurýrem\s+po\s+zaplacení|jsem\s+v\s+zahraničí|jsem\s+na\s+misi)\b/i,
  /\b(whatsapp|telegram)\b.*\b(\+44|\+234|\+1)\b/i,
  /\bklikněte\s+na\s+odkaz\b/i,
].map(w);

export function assessListing(input: { title: string; description: string; price?: number | null; categorySlug?: string }) {
  const text = `${input.title}\n${input.description}`;
  const reasons: string[] = [];
  let score = 0;
  if (PROHIBITED.some((r) => r.test(text))) { score += 80; reasons.push('Možný zakázaný obsah'); }
  if (SCAM.some((r) => r.test(text))) { score += 50; reasons.push('Znaky podvodného inzerátu'); }
  const links = (text.match(/https?:\/\//g) ?? []).length;
  if (links > 2) { score += 20; reasons.push('Mnoho odkazů'); }
  const upper = input.title.replace(/[^A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/g, '').length;
  if (input.title.length > 10 && upper / input.title.length > 0.7) { score += 10; reasons.push('Nadpis velkými písmeny'); }
  if (/(.)\1{6,}/.test(text)) { score += 10; reasons.push('Opakované znaky'); }
  if (input.price != null && input.price > 0 && input.price < 100 && ['auto-moto', 'reality'].includes(input.categorySlug ?? '')) { score += 30; reasons.push('Podezřele nízká cena'); }
  return { score: Math.min(100, score), reasons };
}

export function assessMessage(body: string) {
  return SCAM.some((r) => r.test(body)) ? 'Tato zpráva může být podvod. Nikdy neplaťte předem mimo ověřené kanály a neposílejte údaje z karty.' : null;
}
