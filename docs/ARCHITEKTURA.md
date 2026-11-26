# Architektura a plán rozvoje

## Architektura

```
Prohlížeč / mobil
   │  HTTPS
   ▼
Next.js (apps/web) ── SSR stránek, SEO, /api/* proxy na backend (stejná doména → bezpečné cookie)
   │
   ▼
NestJS API (apps/api) ── REST, autentizace (httpOnly session cookie), validace (zod), rate-limit
   ├── PostgreSQL (Prisma) – zdroj pravdy
   ├── Meilisearch – fulltext, překlepy, synonyma, geo filtr, fasety
   ├── Redis – cache sezení, zámky úloh, anti-spam počítadla
   ├── S3 úložiště – fotky (WebP, bez EXIF/GPS, náhledy)
   └── Úlohy (každých 5 min) – expirace inzerátů, upozornění na uložená hledání
```

Klíčová rozhodnutí:
- **Sezení místo JWT**: náhodný token v httpOnly cookie, v DB jen jeho hash → lze okamžitě odhlásit/zablokovat.
- **Kategorie a filtry v DB** (výchozí data v `packages/shared`), editovatelné v administraci bez programátora.
- **Vyhledávání degraduje**: když Meilisearch neběží, API hledá v PostgreSQL.
- **Hodnocení jen po skutečné konverzaci** (obě strany si napsaly), jednou na konverzaci → brání falešným recenzím.
- **Skóre důvěryhodnosti** se počítá jen z ověřitelných signálů a je uživatelům vysvětleno.
- **Moderace**: pravidlový automat (zakázané zboží, znaky podvodu) → rizikové inzeráty čekají na moderátora; varování u podezřelých zpráv.

## Fáze 1 – MVP (hotovo)
- Vizuální identita a responzivní web (mobile-first), tmavý režim
- Registrace e-mailem, ověření e-mailu a telefonu, Google přihlášení (po zadání klíčů), obnova hesla, GDPR export a smazání účtu
- Vkládání inzerátu v 5 krocích: návrh kategorie podle názvu, více fotek (i z fotoaparátu), video, parametry podle kategorie, návrh popisu, doporučená cena podle podobných nabídek, náhled
- Správa inzerátů: úprava, prodloužení, rezervováno/prodáno, koncepty, expirace a upozornění 3 dny předem
- 17 kategorií, 90+ podkategorií s vlastními filtry
- Hledání: přirozený jazyk („iPhone do 15 000 Kč Praha“), překlepy, synonyma, našeptávač, filtry (cena, lokalita + okruh v km, kraj, stav, typ, datum, ověřený prodejce, parametry kategorie), řazení, uložená hledání s upozorněním
- Zprávy: konverzace k inzerátu, fotky, blokování, nahlášení, varování před podvodem, e-mailové notifikace
- Oblíbené, sledování prodejců, porovnání až 4 inzerátů, profil prodejce s hodnocením
- Administrace s rolemi (moderátor/admin): statistiky, moderace, nahlášení, uživatelé, kategorie + SEO, ceník služeb, informační stránky, auditní log
- SEO: čitelné URL, meta, strukturovaná data (schema.org Product/Offer), sitemap.xml, robots.txt

## Fáze 2 – monetizace a provoz
- Platební brána (Comgate / GoPay / Stripe) – topování, zvýraznění, posunutí, prémiové inzeráty, balíčky a předplatné pro firmy (ceník už je v administraci)
- Reklamní plochy a sponzorované nabídky
- Produkční nasazení, vlastní doména, zálohy DB (denní + PITR), monitoring, GA4/Plausible
- SMS brána pro ověření telefonu, Apple přihlášení, CAPTCHA klíče
- WebSocket pro okamžité zprávy (nyní obnovování každých 5 s)

## Fáze 3 – AI a rozšíření
- AI asistent (Claude): popis z několika slov, rozpoznání nevhodného obsahu z textu i fotek
- Doporučení podle historie hledání, „podobné“ přes vektorové hledání
- Mapa inzerátů
- Firemní profily s vlastní stránkou, statistiky pro prodejce
- Mobilní aplikace (React Native / Expo), push notifikace, rychlé vložení z fotoaparátu
- Slovenská jazyková verze a další trhy
