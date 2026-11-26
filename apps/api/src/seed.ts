/* Výchozí data: kategorie, ceník, informační stránky, admin účet a ukázkové inzeráty. Spuštění: pnpm db:seed */
import { PrismaClient, Prisma } from '@prisma/client';
import { CATEGORIES, CITIES, slugify } from '@dej/shared';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { StorageService } from './media/storage.service';

const prisma = new PrismaClient();
const storage = new StorageService();

type Item = [sub: string, title: string, price: number | null, cond: 'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED' | null, attrs: Record<string, unknown>, desc?: string];

const ITEMS: Record<string, Item[]> = {
  'auto-moto': [
    ['osobni-auta', 'Škoda Octavia III Combi 2.0 TDI, servisní knížka', 289000, 'USED', { brand: 'Škoda', year: 2018, mileage: 168000, fuel: 'Nafta', gearbox: 'Manuální', body: 'Kombi', power: 110 }],
    ['osobni-auta', 'Toyota Corolla 1.8 Hybrid, 1. majitel, ČR', 459000, 'USED', { brand: 'Toyota', year: 2021, mileage: 54000, fuel: 'Hybrid', gearbox: 'Automatická', body: 'Hatchback', power: 90 }],
    ['osobni-auta', 'Tesla Model 3 Long Range AWD, autopilot', 799000, 'LIKE_NEW', { brand: 'Tesla', year: 2022, mileage: 39000, fuel: 'Elektro', gearbox: 'Automatická', body: 'Sedan', power: 324 }],
    ['osobni-auta', 'Hyundai i30 1.4 T-GDi, tažné, zimní pneu', 329000, 'USED', { brand: 'Hyundai', year: 2019, mileage: 92000, fuel: 'Benzín', gearbox: 'Manuální', body: 'Hatchback', power: 103 }],
    ['motorky', 'Honda CB500F, ABS, nové pneu', 119000, 'USED', { year: 2019, mileage: 18000, fuel: 'Benzín' }],
    ['pneu-kola', 'Zimní pneumatiky Michelin 205/55 R16, 4 ks', 4500, 'USED', {}],
    ['karavany', 'Obytný přívěs Adria Altea 4 lůžka', 245000, 'USED', { year: 2015 }],
  ],
  reality: [
    ['byty-pronajem', 'Pronájem bytu 2+kk, 54 m², Praha 7 – Holešovice', 21500, null, { offerType: 'Pronájem', layout: '2+kk', area: 54, ownership: 'Osobní', energy: 'C' }],
    ['byty', 'Prodej bytu 3+1, 78 m², balkon, sklep', 4890000, null, { offerType: 'Prodej', layout: '3+1', area: 78, ownership: 'Osobní', energy: 'D' }],
    ['byty-pronajem', 'Pronájem 1+kk po rekonstrukci, u metra', 14900, null, { offerType: 'Pronájem', layout: '1+kk', area: 31, ownership: 'Osobní', energy: 'B' }],
    ['domy', 'Rodinný dům 5+1 se zahradou 820 m²', 8950000, null, { offerType: 'Prodej', layout: '5+ a větší', area: 164, ownership: 'Osobní', energy: 'C' }],
    ['pozemky', 'Stavební pozemek 1 050 m², sítě na hranici', 2350000, null, { offerType: 'Prodej', area: 1050 }],
    ['chaty-chalupy', 'Chalupa v Krkonoších, krb, 4 pokoje', 3990000, null, { offerType: 'Prodej', area: 120 }],
  ],
  elektronika: [
    ['televize', 'Samsung QLED 65" Q80C, v záruce', 18990, 'LIKE_NEW', { brand: 'Samsung', warranty: true }],
    ['audio', 'Sluchátka Sony WH-1000XM5, černá', 6490, 'LIKE_NEW', { brand: 'Sony', warranty: true }],
    ['herni-konzole', 'PlayStation 5 Slim + 2 ovladače + 3 hry', 11900, 'USED', { brand: 'Sony' }],
    ['foto-video', 'Fujifilm X-T30 II + objektiv 15–45 mm', 17500, 'USED', { brand: 'Jiná' }],
    ['domaci-spotrebice', 'Pračka Bosch Serie 6, 9 kg, A+++', 7900, 'USED', { brand: 'Jiná' }],
    ['chytra-domacnost', 'Robotický vysavač Xiaomi S10+', 5990, 'LIKE_NEW', { brand: 'Xiaomi', warranty: true }],
  ],
  mobily: [
    ['mobilni-telefony', 'iPhone 15 Pro 256 GB, Natural Titanium', 21990, 'LIKE_NEW', { brand: 'Apple', storage: '256 GB', battery: 94, warranty: true }],
    ['mobilni-telefony', 'iPhone 13 128 GB, modrý, baterie 86 %', 9490, 'USED', { brand: 'Apple', storage: '128 GB', battery: 86 }],
    ['mobilni-telefony', 'Samsung Galaxy S24 Ultra 512 GB', 23990, 'LIKE_NEW', { brand: 'Samsung', storage: '512 GB', battery: 98, warranty: true }],
    ['mobilni-telefony', 'Google Pixel 8, 128 GB, obal zdarma', 10900, 'USED', { brand: 'Google', storage: '128 GB', battery: 91 }],
    ['chytre-hodinky', 'Apple Watch Series 9 45 mm GPS', 7490, 'LIKE_NEW', { brand: 'Apple' }],
    ['tablety', 'iPad Air M2 11" 128 GB Wi-Fi', 13900, 'NEW', { brand: 'Apple', storage: '128 GB', warranty: true }],
  ],
  pocitace: [
    ['notebooky', 'MacBook Air M2 13", 16 GB, 512 GB', 23900, 'LIKE_NEW', { brand: 'Apple', ram: '16 GB', warranty: true }],
    ['notebooky', 'Lenovo ThinkPad T14 Gen 3, i5, 16 GB', 14500, 'USED', { brand: 'Lenovo', ram: '16 GB' }],
    ['komponenty', 'Grafická karta NVIDIA RTX 4070 Super', 13900, 'LIKE_NEW', { brand: 'MSI', warranty: true }],
    ['monitory', 'Monitor Dell U2723QE 27" 4K USB-C', 9900, 'USED', { brand: 'Dell' }],
    ['stolni-pc', 'Herní PC Ryzen 7 7800X3D, RTX 4080, 32 GB', 45900, 'LIKE_NEW', { brand: 'Jiná', ram: '32 GB', warranty: true }],
  ],
  nabytek: [
    ['obyvaci-pokoj', 'Rohová sedačka rozkládací, šedá, 280 cm', 8900, 'USED', { material: 'Látka', delivery: true }],
    ['kuchyne', 'Jídelní stůl dub masiv + 6 židlí', 12500, 'USED', { material: 'Dřevo' }],
    ['loznice', 'Postel 180×200 s úložným prostorem', 5900, 'LIKE_NEW', { material: 'Dřevo', delivery: true }],
    ['osvetleni', 'Designová lampa Louis Poulsen PH5', 9900, 'USED', { material: 'Kov' }],
    ['dekorace', 'Velké zrcadlo v dřevěném rámu 180 cm', 2400, 'USED', { material: 'Dřevo' }],
  ],
  'dum-zahrada': [
    ['zahradni-technika', 'Robotická sekačka Husqvarna Automower 305', 15900, 'USED', { delivery: false }],
    ['zahradni-nabytek', 'Ratanová sedací souprava na terasu', 6900, 'LIKE_NEW', { delivery: true }],
    ['rostliny', 'Monstera deliciosa, 120 cm, v květináči', 1200, null, {}],
    ['vytapeni', 'Krbová kamna Romotop, 8 kW', 9500, 'USED', {}],
    ['bazeny', 'Nadzemní bazén Intex 4,57 × 1,22 m s filtrací', 4500, 'USED', {}],
  ],
  obleceni: [
    ['damske', 'Zimní bunda The North Face, vel. M', 2900, 'LIKE_NEW', { gender: 'Dámské', size: 'M', brand: 'The North Face' }],
    ['panske', 'Pánský oblek Hugo Boss, slim fit, vel. 50', 3500, 'LIKE_NEW', { gender: 'Pánské', size: 'L', brand: 'Jiná' }],
    ['obuv', 'Nike Air Max 90, vel. 42, nenošené', 2200, 'NEW', { gender: 'Pánské', size: '42', brand: 'Nike' }],
    ['kabelky', 'Kožená kabelka, koňak, jako nová', 1500, 'LIKE_NEW', { gender: 'Dámské' }],
  ],
  deti: [
    ['kocarky', 'Kočárek Cybex Priam 3v1, platinový rám', 14900, 'USED', { age: '0–6 měsíců' }],
    ['autosedacky', 'Autosedačka Britax Römer Kidfix i-Size', 2900, 'USED', { age: '3–6 let' }],
    ['hracky', 'LEGO Technic 42143 Ferrari Daytona SP3, kompletní', 6900, 'LIKE_NEW', { age: '10+ let' }],
    ['detsky-nabytek', 'Dětská postel s psacím stolem, bílá', 3900, 'USED', { age: '6–10 let' }],
    ['detske-obleceni', 'Balík oblečení pro holčičku vel. 86–92', 600, 'USED', { size: '92', age: '1–3 roky' }],
  ],
  sport: [
    ['cyklistika', 'Horské kolo Specialized Rockhopper 29", rám L', 14500, 'USED', { brand: 'Specialized', frame: 'L', wheel: '29"' }],
    ['cyklistika', 'Silniční kolo Trek Domane AL 3, 56 cm', 18900, 'LIKE_NEW', { brand: 'Trek', frame: 'M', wheel: '700c' }],
    ['zimni-sporty', 'Lyže Atomic Redster 170 cm + vázání', 4900, 'USED', { brand: 'Atomic' }],
    ['fitness', 'Rotoped Kettler, magnetická brzda', 3900, 'USED', {}],
    ['turistika', 'Stan Husky pro 3 osoby, používaný 2×', 2300, 'LIKE_NEW', {}],
  ],
  zvirata: [
    ['psi', 'Štěňata labradora s PP, odčervená', 18000, null, { pedigree: true, sex: 'Samec' }],
    ['kocky', 'Kotě britské modré, očkované', 6000, null, { sex: 'Samice' }],
    ['chovatelske-potreby', 'Akvárium 240 l s kompletním vybavením', 5500, 'USED', {}],
  ],
  prace: [
    ['nabidka-prace', 'Hledáme skladníka, ranní směny, 38 000 Kč', null, null, { jobType: 'Plný úvazek', salary: 38000 }, 'Nabízíme stabilní práci ve skladu e-shopu. Ranní směny 6–14:30, stravenky, 5 týdnů dovolené, bonusy. Požadujeme spolehlivost a VZV průkaz výhodou.'],
    ['brigady', 'Brigáda o víkendech – obsluha v kavárně', null, null, { jobType: 'Brigáda', salary: 190 }, 'Hledáme usměvavou posilu na víkendy do kavárny v centru. 190 Kč/h + dýška, zaškolení zajistíme, vhodné i pro studenty.'],
    ['nabidka-prace', 'Frontend vývojář (React), home office', null, null, { jobType: 'Home office', salary: 85000 }, 'Rostoucí česká firma hledá frontend vývojáře. React, TypeScript, Next.js. Plně remote, flexibilní pracovní doba, MacBook, vzdělávací rozpočet.'],
  ],
  sluzby: [
    ['stehovani', 'Stěhování bytů a firem, celá ČR, levně', 590, null, { area: 'Celá ČR' }, 'Stěhujeme byty, domy i kanceláře. Dodávky s plachtou i skříňové, balicí materiál, montáž nábytku. Cena od 590 Kč/hod. Volejte nebo pište.'],
    ['remesla', 'Elektrikář – revize, opravy, nové rozvody', 650, null, { area: 'Celý kraj' }],
    ['douceni', 'Doučování matematiky a fyziky, i online', 450, null, { area: 'Online' }],
    ['uklid', 'Úklid domácností a kanceláří, pravidelně i jednorázově', 350, null, { area: 'Místní' }],
  ],
  'stroje-naradi': [
    ['elektricke-naradi', 'Aku vrtačka Makita DDF484 + 2 baterie', 4900, 'USED', { brand: 'Makita', power: 'Aku' }],
    ['elektricke-naradi', 'Bosch GBH 2-28 F vrtací kladivo', 5900, 'LIKE_NEW', { brand: 'Bosch', power: 'Síť' }],
    ['zemedelske-stroje', 'Malotraktor Vari s příslušenstvím', 39000, 'USED', { brand: 'Jiná', power: 'Benzín' }],
    ['dilna', 'Ponk dílenský s nářadím, 150 cm', 3500, 'USED', {}],
  ],
  hudba: [
    ['kytary', 'Fender Player Stratocaster, Mexico, Sunburst', 17900, 'LIKE_NEW', { brand: 'Fender' }],
    ['klavesy', 'Digitální piano Yamaha P-145 + stojan', 10900, 'LIKE_NEW', { brand: 'Yamaha' }],
    ['bici', 'Bicí souprava Pearl Export, kompletní', 14500, 'USED', { brand: 'Pearl' }],
    ['desky', 'Sbírka vinylů – Beatles, Pink Floyd, 40 ks', 6000, 'USED', {}],
  ],
  sberatelstvi: [
    ['mince', 'Sada oběžných mincí ČSSR 1953–1990', 2500, null, { era: '1945–1989' }],
    ['starozitnosti', 'Starožitná komoda, ořech, kolem roku 1900', 15000, 'USED', { era: '1900–1945' }],
    ['modely', 'Modely aut Matchbox, 60 kusů, krabičky', 3200, 'USED', {}],
    ['stare-knihy', 'Komplet Harry Potter, 1. vydání CZ', 4500, 'USED', {}],
  ],
  knihy: [
    ['ucebnice', 'Učebnice matematiky pro gymnázia, sada 4 dílů', 900, 'USED', { bookLang: 'Čeština', binding: 'Brožovaná' }],
    ['beletrie', 'Balík 20 detektivek – Nesbø, Läckberg, Christie', 1200, 'USED', { bookLang: 'Čeština', binding: 'Pevná' }],
    ['detske-knihy', 'Dětské knihy s ilustracemi, 15 ks, jako nové', 600, 'LIKE_NEW', { bookLang: 'Čeština', binding: 'Pevná' }],
  ],
  hobby: [
    ['deskovky', 'Catan + 2 rozšíření, kompletní', 1400, 'LIKE_NEW', {}],
    ['rybareni', 'Kaprový prut Shimano + naviják, sada', 3200, 'USED', {}],
    ['modelarstvi', 'RC model auta 1:10, 4x4, baterie a nabíječka', 2900, 'USED', {}],
  ],
  potraviny: [
    ['med', 'Květový med z Vysočiny, 1 kg sklenice', 220, null, { bio: 'Ano' }],
    ['ovoce-zelenina', 'Jablka ze sadu – Jonagold, bedýnka 10 kg', 250, null, { bio: 'Ne' }],
    ['farmarske', 'Domácí vejce z volného chovu, 30 ks', 150, null, { bio: 'Ano' }],
  ],
  ostatni: [
    ['vstupenky', '2 vstupenky na koncert, sektor A, Praha', 3200, null, {}],
    ['darujeme', 'Daruji za odvoz: starší skříň a botník', 0, 'USED', {}],
    ['ruzne', 'Kávovar DeLonghi Magnifica S, po servisu', 3900, 'USED', {}],
  ],
};

/** Ukázkové fotky: neutrální šedé pozadí a grafitová ikona (skutečné fotky nahrají uživatelé). */
const COLORS = [['#EEF1F3', '#353B42'], ['#F3F4F5', '#4A5159'], ['#E9EDEF', '#2B3036'], ['#F1F3F2', '#3E4449']];
const iconSvg = (icon: string) => readFileSync(join(require.resolve('lucide-static/package.json'), '..', 'icons', `${icon}.svg`), 'utf8');

async function demoImage(icon: string, seed: number, variant: number) {
  const [bg, fg] = COLORS[(seed + variant) % COLORS.length];
  const inner = iconSvg(icon).replace(/<svg[^>]*>/, '').replace('</svg>', '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <defs><radialGradient id="g" cx="${30 + ((seed * 17) % 40)}%" cy="35%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs>
    <rect width="1200" height="900" fill="${bg}"/><rect width="1200" height="900" fill="url(#g)"/>
    <g transform="translate(${420 + variant * 30} ${270 - variant * 10}) scale(${15 - variant})" fill="none" stroke="${fg}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
  </svg>`;
  return sharp(Buffer.from(svg));
}

async function main() {
  console.log('Kategorie…');
  for (const [i, c] of CATEGORIES.entries()) {
    const parent = (await prisma.category.findFirst({ where: { slug: c.slug, parentId: null } })) ?? (await prisma.category.create({
      data: { slug: c.slug, name: c.name, icon: c.icon, position: i, filters: c.filters as unknown as Prisma.InputJsonValue, seoTitle: `${c.name} – inzeráty z celé ČR | Dejinzerat.cz`, seoDescription: `Bazar a inzerce v kategorii ${c.name}. Tisíce nabídek od soukromých prodejců i firem, rychlé hledání a bezpečná komunikace.` },
    }));
    for (const [j, s] of c.children.entries()) {
      const exists = await prisma.category.findFirst({ where: { slug: s.slug, parentId: parent.id } });
      if (!exists) await prisma.category.create({ data: { slug: s.slug, name: s.name, parentId: parent.id, position: j, filters: (s.filters ?? []) as unknown as Prisma.InputJsonValue, seoTitle: `${s.name} – ${c.name} | Dejinzerat.cz`, seoDescription: `${s.name}: aktuální inzeráty, nové i použité. Prodávejte a nakupujte bezpečně na Dejinzerat.cz.` } });
    }
  }

  console.log('Ceník a stránky…');
  const prices = [
    ['TOP_7', 'Topování na 7 dní', 'Inzerát se zobrazuje na prvních pozicích ve výpisu.', 79, 7],
    ['HIGHLIGHT_7', 'Zvýraznění na 7 dní', 'Barevný rámeček a štítek, který přitáhne pozornost.', 49, 7],
    ['BUMP', 'Posunutí na začátek', 'Inzerát se jednorázově přesune mezi nejnovější.', 29, null],
    ['PREMIUM_30', 'Prémiový inzerát na 30 dní', 'Top + zvýraznění + více fotek a video.', 199, 30],
    ['BUSINESS_M', 'Firemní balíček – měsíc', 'Firemní profil, 100 aktivních inzerátů, statistiky.', 990, 30],
    ['PRO_M', 'Předplatné Profi prodejce – měsíc', 'Neomezené inzeráty, 10× topování měsíčně, prioritní podpora.', 1990, 30],
  ] as const;
  for (const [code, name, description, priceCzk, durationDays] of prices) await prisma.priceItem.upsert({ where: { code }, update: {}, create: { code, name, description, priceCzk, durationDays } });
  const pages = [
    ['podminky', 'Podmínky používání', 'Používáním portálu Dejinzerat.cz souhlasíte s těmito podmínkami…\n\n(Text doplní provozovatel v administraci.)'],
    ['ochrana-udaju', 'Ochrana osobních údajů (GDPR)', 'Osobní údaje zpracováváme v souladu s nařízením GDPR. Máte právo na přístup, opravu, výmaz a přenositelnost údajů – export i smazání účtu najdete v Nastavení účtu.\n\n(Podrobný text doplní provozovatel.)'],
    ['bezpecny-nakup', 'Jak nakupovat bezpečně', 'Nikdy neplaťte předem neznámým prodejcům mimo ověřené platební kanály. Neposílejte údaje z platební karty ani kódy z SMS. Zboží si pokud možno prohlédněte osobně. Podezřelý inzerát nebo zprávu nahlaste tlačítkem „Nahlásit“.'],
    ['napoveda', 'Nápověda', 'Jak vložit inzerát, jak funguje topování, jak si uložit hledání… (text doplní provozovatel).'],
    ['kontakt', 'Kontakt', 'Dejinzerat.cz – podpora: podpora@dejinzerat.cz'],
  ];
  for (const [slug, title, content] of pages) await prisma.page.upsert({ where: { slug }, update: {}, create: { slug, title, content } });

  if (await prisma.listing.count()) { console.log('Ukázkové inzeráty už existují, přeskakuji.'); return; }

  console.log('Uživatelé…');
  const hash = await bcrypt.hash('Heslo1234', 12);
  await prisma.user.upsert({ where: { email: 'admin@dejinzerat.cz' }, update: {}, create: { email: 'admin@dejinzerat.cz', name: 'Administrátor', role: 'ADMIN', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'Admin12345', 12), emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() } });
  const names = ['Jana Nováková', 'Petr Svoboda', 'Lucie Dvořáková', 'Tomáš Černý', 'Kateřina Procházková', 'Martin Kučera', 'Eva Veselá', 'Jakub Horák', 'Autobazar Morava s.r.o.', 'Reality Plus'];
  const users = [];
  for (const [i, name] of names.entries()) {
    const biz = i >= 8;
    const city = CITIES[(i * 7) % CITIES.length];
    users.push(await prisma.user.create({ data: {
      email: `demo${i + 1}@dejinzerat.cz`, name, passwordHash: hash, emailVerifiedAt: new Date(), phoneVerifiedAt: i % 3 === 2 ? null : new Date(), phone: `+420 7${String(10000000 + i * 1234567).slice(0, 8)}`,
      city: city.name, region: city.region, isBusiness: biz, companyName: biz ? name : null, companyId: biz ? String(27000000 + i * 1111) : null,
      createdAt: new Date(Date.now() - (60 + i * 120) * 864e5), bio: biz ? 'Profesionální prodejce s dlouholetou tradicí.' : null,
    } }));
  }

  console.log('Inzeráty…');
  let n = 0;
  const cities = CITIES.filter((c) => c.region.length === 3);
  for (const cat of CATEGORIES) {
    const items = ITEMS[cat.slug] ?? [];
    const subs = await prisma.category.findMany({ where: { parent: { slug: cat.slug } } });
    for (const [k, [subSlug, title, price, cond, attrs, desc]] of items.entries()) {
      const sub = subs.find((s) => s.slug === subSlug)!;
      const copies = cat.slug === 'mobily' || cat.slug === 'auto-moto' ? 2 : 1;
      for (let c = 0; c < copies; c++) {
        n++;
        const city = cities[(n * 5 + c * 3) % cities.length];
        const user = cat.slug === 'auto-moto' && k < 4 ? users[8] : cat.slug === 'reality' ? users[9] : users[(n + c) % 8];
        const created = new Date(Date.now() - ((n * 7) % 28) * 864e5 - (n % 24) * 36e5);
        const p = price == null ? null : c ? Math.round((price * (0.9 + ((n % 5) / 20))) / 100) * 100 : price;
        const description = desc ?? `${title}.\n\nProdávám z důvodu ${['nadbytečnosti', 'přechodu na nový model', 'stěhování', 'nevyužití'][n % 4]}. ${cond === 'NEW' ? 'Zboží je zcela nové, nerozbalené.' : cond === 'LIKE_NEW' ? 'Stav jako nové, bez škrábanců, kompletní balení.' : 'Běžné stopy používání, plně funkční.'}\n\nOsobní předání v lokalitě ${city.name}, případně pošlu přes Zásilkovnu. Na dotazy rád odpovím ve zprávě.`;
        const l = await prisma.listing.create({ data: {
          slug: slugify(title), title, description, price: p, priceNegotiable: p == null || n % 6 === 0, condition: cond, offerType: cat.slug === 'reality' && (attrs.offerType === 'Pronájem') ? 'RENT' : 'SELL',
          categoryId: sub.id, userId: user.id, city: city.name, region: city.region, zip: city.zip, lat: city.lat + ((n % 7) - 3) * 0.01, lng: city.lng + ((n % 5) - 2) * 0.01,
          attributes: attrs as Prisma.InputJsonValue, status: 'ACTIVE', createdAt: created, publishedAt: created, expiresAt: new Date(created.getTime() + 30 * 864e5),
          views: (n * 37) % 900, topUntil: n % 11 === 0 ? new Date(Date.now() + 5 * 864e5) : null, highlightedUntil: n % 7 === 0 ? new Date(Date.now() + 5 * 864e5) : null,
        } });
        const imgs = 2 + (n % 3);
        for (let v = 0; v < imgs; v++) {
          const img = await demoImage(cat.icon, n, v);
          const key = `demo/${l.id}_${v}`;
          const large = await img.clone().resize(1200, 900).webp({ quality: 80 }).toBuffer();
          const thumb = await img.clone().resize(640, 480).webp({ quality: 75 }).toBuffer();
          const [url, thumbUrl] = await Promise.all([storage.put(`${key}.webp`, large, 'image/webp'), storage.put(`${key}_t.webp`, thumb, 'image/webp')]);
          await prisma.listingImage.create({ data: { listingId: l.id, ownerId: user.id, url, thumbUrl, width: 1200, height: 900, position: v } });
        }
      }
    }
  }

  // Ukázkové konverzace a hodnocení (navázané na konverzace)
  const some = await prisma.listing.findMany({ take: 12, orderBy: { createdAt: 'desc' } });
  for (const [i, l] of some.entries()) {
    const buyer = users[(i + 3) % 8];
    if (buyer.id === l.userId) continue;
    const conv = await prisma.conversation.create({ data: { listingId: l.id, buyerId: buyer.id, sellerId: l.userId } });
    await prisma.message.create({ data: { conversationId: conv.id, senderId: buyer.id, body: 'Dobrý den, je inzerát ještě aktuální? Šlo by se podívat o víkendu?' } });
    await prisma.message.create({ data: { conversationId: conv.id, senderId: l.userId, body: 'Dobrý den, ano, je. V sobotu odpoledne mi to vyhovuje.', readAt: new Date() } });
    await prisma.review.create({ data: { authorId: buyer.id, sellerId: l.userId, conversationId: conv.id, rating: 4 + (i % 2), text: ['Vše proběhlo bez problémů, doporučuji.', 'Rychlá domluva, zboží odpovídalo popisu.', 'Super prodejce, děkuji!'][i % 3] } });
  }
  console.log(`Hotovo: ${n} inzerátů.`);
}

main().finally(() => prisma.$disconnect());
