# Dejinzerat.cz

Moderní inzertní portál pro ČR a SR. Monorepo:

| Složka | Co obsahuje |
|---|---|
| `apps/web` | Web – Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| `apps/api` | Backend – NestJS 11, Prisma 6, PostgreSQL, Meilisearch, Redis, S3 |
| `packages/shared` | Sdílený kód: kategorie a jejich filtry, lokality, parser chytrého hledání |
| `docs/` | Architektura a plán rozvoje |

## Rychlý start (vývoj)

```bash
docker compose up -d            # PostgreSQL, Redis, Meilisearch, MinIO
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm --filter @dej/shared build
cd apps/api && npx prisma migrate deploy && pnpm build && pnpm seed && cd ../..
pnpm dev                        # web: http://localhost:3000, API: http://localhost:4000
```

Skripty API (`dev`, `start`, `seed`, `smoke`) si samy načtou `apps/api/.env`, pokud existuje (Node 22 `--env-file-if-exists`).

## Testy a kontrola na GitHubu

```bash
pnpm --filter @dej/shared build && pnpm --filter @dej/api build
pnpm test                         # jednotkové testy (apps/api/src/**/*.spec.ts)
pnpm --filter @dej/api smoke      # zkušební spuštění API nad databází s výchozími daty
```

GitHub Actions (`.github/workflows/ci.yml`) spustí u každého pull requestu a pushe do `main`: instalaci, sestavení, testy, migrace a seed nad čistou databází, zkušební spuštění API, zabalení API pro Vercel a sestavení webu. Nepotřebuje žádné tajné klíče.

Po seedu existují účty:
- `admin@dejinzerat.cz` / `Admin12345` (administrátor – **v produkci změňte**, nebo nastavte `ADMIN_PASSWORD` před seedem)
- `demo1@dejinzerat.cz` … `demo10@dejinzerat.cz` / `Heslo1234` (ukázkoví prodejci)

Po prvním spuštění se v administraci (Přehled → nebo `POST /admin/reindex`) přeindexuje vyhledávání; API to při startu dělá samo, když je index prázdný.

## Proměnné prostředí API (`apps/api/.env`)

| Proměnná | Význam |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `REDIS_URL` | Redis (cache, zámky úloh, limity). Bez něj se použije paměť. |
| `MEILI_URL`, `MEILI_KEY` | Meilisearch. Bez něj se hledá v PostgreSQL (bez oprav překlepů). |
| `WEB_ORIGIN` | Adresa webu (CORS, odkazy v e-mailech) |
| `S3_*` | S3 kompatibilní úložiště fotek (AWS, Cloudflare R2, Supabase Storage, MinIO). Bez nich lokální disk. |
| `RESEND_API_KEY`, `MAIL_FROM` | Odesílání e-mailů. Bez klíče se e-maily jen logují. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Přihlášení přes Google |
| `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY` | CAPTCHA (Cloudflare Turnstile) |
| `PREMODERATION=1` | Všechny inzeráty čekají na schválení |
| `COOKIE_SECURE=1` | Zapnout na HTTPS |

Web (`apps/web/.env.local`): `API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL`, `NOINDEX=1` pro testovací prostředí.

## Nasazení (dočasná verze)

- Hosting: Vercel, tým `dejinzerat-5803`, projekt `dejinzerat` (Root Directory `apps/web`). Každý push do větve `main` se nasadí automaticky.
- API (NestJS) běží na Vercelu uvnitř webu: `apps/web/src/pages/api/[...path].ts` načítá zabalené API z `apps/web/.api/server.js` (vytváří `pnpm --filter @dej/api vercel-build`).
- Databáze: Supabase PostgreSQL (pooler aws-0-eu-central-1, role `dej_app`), schéma `app`. Migrace a výchozí data se spouští při sestavení.
- Fotky: Vercel Blob (`BLOB_READ_WRITE_TOKEN`). Hledání bez Meilisearch běží v PostgreSQL.
- Proměnné prostředí jsou jen ve Vercelu (DATABASE_URL, DIRECT_URL, CRON_SECRET, ADMIN_PASSWORD, COOKIE_SECURE, DISABLE_JOBS, NOINDEX).
