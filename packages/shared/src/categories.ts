/**
 * Strom kategorií a jejich filtrů. Slouží jako výchozí data (seed) –
 * v produkci se kategorie spravují v administraci a ukládají v databázi.
 */

export type FilterType = 'select' | 'multiselect' | 'range' | 'boolean';

export interface FilterDef {
  key: string;
  label: string;
  type: FilterType;
  /** Pro select/multiselect */
  options?: string[];
  /** Pro range */
  unit?: string;
  min?: number;
  max?: number;
}

export interface CategoryDef {
  slug: string;
  name: string;
  icon: string;
  filters: FilterDef[];
  children: { slug: string; name: string; filters?: FilterDef[] }[];
}

const year = (label = 'Rok výroby'): FilterDef => ({ key: 'year', label, type: 'range', min: 1950, max: 2026 });
const brand = (options: string[]): FilterDef => ({ key: 'brand', label: 'Značka', type: 'select', options });
const size = (options: string[], label = 'Velikost'): FilterDef => ({ key: 'size', label, type: 'multiselect', options });

export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'auto-moto', name: 'Auto-moto', icon: 'car',
    filters: [
      brand(['Škoda', 'Volkswagen', 'Toyota', 'Hyundai', 'Ford', 'BMW', 'Audi', 'Mercedes-Benz', 'Renault', 'Peugeot', 'Kia', 'Dacia', 'Opel', 'Tesla', 'Jiná']),
      year(),
      { key: 'mileage', label: 'Najeto', type: 'range', unit: 'km', min: 0, max: 500000 },
      { key: 'fuel', label: 'Palivo', type: 'multiselect', options: ['Benzín', 'Nafta', 'Hybrid', 'Elektro', 'LPG', 'CNG'] },
      { key: 'gearbox', label: 'Převodovka', type: 'select', options: ['Manuální', 'Automatická'] },
      { key: 'body', label: 'Karoserie', type: 'select', options: ['Hatchback', 'Sedan', 'Kombi', 'SUV', 'MPV', 'Kupé', 'Kabriolet', 'Pick-up', 'Dodávka'] },
      { key: 'power', label: 'Výkon', type: 'range', unit: 'kW', min: 0, max: 500 },
    ],
    children: [
      { slug: 'osobni-auta', name: 'Osobní automobily' },
      { slug: 'motorky', name: 'Motocykly a skútry' },
      { slug: 'uzitkova-vozidla', name: 'Užitkové vozy' },
      { slug: 'nahradni-dily', name: 'Náhradní díly', filters: [] },
      { slug: 'pneu-kola', name: 'Pneumatiky a kola', filters: [] },
      { slug: 'karavany', name: 'Karavany a přívěsy' },
      { slug: 'auto-prislusenstvi', name: 'Příslušenství' },
    ],
  },
  {
    slug: 'reality', name: 'Reality', icon: 'house',
    filters: [
      { key: 'offerType', label: 'Typ nabídky', type: 'select', options: ['Prodej', 'Pronájem', 'Podnájem'] },
      { key: 'layout', label: 'Dispozice', type: 'multiselect', options: ['1+kk', '1+1', '2+kk', '2+1', '3+kk', '3+1', '4+kk', '4+1', '5+ a větší'] },
      { key: 'area', label: 'Užitná plocha', type: 'range', unit: 'm²', min: 0, max: 1000 },
      { key: 'ownership', label: 'Vlastnictví', type: 'select', options: ['Osobní', 'Družstevní', 'Státní/obecní'] },
      { key: 'energy', label: 'Energetická třída', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
    ],
    children: [
      { slug: 'byty', name: 'Byty na prodej' },
      { slug: 'byty-pronajem', name: 'Byty k pronájmu' },
      { slug: 'domy', name: 'Domy' },
      { slug: 'pozemky', name: 'Pozemky' },
      { slug: 'chaty-chalupy', name: 'Chaty a chalupy' },
      { slug: 'komercni', name: 'Komerční prostory' },
      { slug: 'garaze', name: 'Garáže' },
    ],
  },
  {
    slug: 'elektronika', name: 'Elektronika', icon: 'tv',
    filters: [brand(['Samsung', 'LG', 'Sony', 'Philips', 'Panasonic', 'Bose', 'JBL', 'Xiaomi', 'Jiná']), { key: 'warranty', label: 'V záruce', type: 'boolean' }],
    children: [
      { slug: 'televize', name: 'Televize' },
      { slug: 'audio', name: 'Audio technika' },
      { slug: 'foto-video', name: 'Fotoaparáty a video' },
      { slug: 'herni-konzole', name: 'Herní konzole' },
      { slug: 'domaci-spotrebice', name: 'Domácí spotřebiče' },
      { slug: 'chytra-domacnost', name: 'Chytrá domácnost' },
    ],
  },
  {
    slug: 'mobily', name: 'Mobily a příslušenství', icon: 'smartphone',
    filters: [
      brand(['Apple', 'Samsung', 'Xiaomi', 'Google', 'Motorola', 'OnePlus', 'Huawei', 'Nokia', 'Jiná']),
      { key: 'storage', label: 'Úložiště', type: 'multiselect', options: ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'] },
      { key: 'battery', label: 'Kondice baterie', type: 'range', unit: '%', min: 0, max: 100 },
      { key: 'warranty', label: 'V záruce', type: 'boolean' },
    ],
    children: [
      { slug: 'mobilni-telefony', name: 'Mobilní telefony' },
      { slug: 'chytre-hodinky', name: 'Chytré hodinky' },
      { slug: 'tablety', name: 'Tablety' },
      { slug: 'prislusenstvi', name: 'Příslušenství', filters: [] },
    ],
  },
  {
    slug: 'pocitace', name: 'Počítače a IT', icon: 'laptop',
    filters: [
      brand(['Apple', 'Lenovo', 'Dell', 'HP', 'Asus', 'Acer', 'MSI', 'Jiná']),
      { key: 'ram', label: 'Operační paměť', type: 'multiselect', options: ['4 GB', '8 GB', '16 GB', '32 GB', '64 GB+'] },
      { key: 'warranty', label: 'V záruce', type: 'boolean' },
    ],
    children: [
      { slug: 'notebooky', name: 'Notebooky' },
      { slug: 'stolni-pc', name: 'Stolní počítače' },
      { slug: 'komponenty', name: 'Komponenty' },
      { slug: 'monitory', name: 'Monitory' },
      { slug: 'periferie', name: 'Periferie a příslušenství' },
      { slug: 'site-servery', name: 'Sítě a servery' },
    ],
  },
  {
    slug: 'nabytek', name: 'Nábytek a bydlení', icon: 'sofa',
    filters: [{ key: 'material', label: 'Materiál', type: 'multiselect', options: ['Dřevo', 'Kov', 'Plast', 'Sklo', 'Látka', 'Kůže'] }, { key: 'delivery', label: 'Možnost dovozu', type: 'boolean' }],
    children: [
      { slug: 'obyvaci-pokoj', name: 'Obývací pokoj' },
      { slug: 'loznice', name: 'Ložnice' },
      { slug: 'kuchyne', name: 'Kuchyně a jídelna' },
      { slug: 'koupelna', name: 'Koupelna' },
      { slug: 'dekorace', name: 'Dekorace a doplňky' },
      { slug: 'osvetleni', name: 'Osvětlení' },
    ],
  },
  {
    slug: 'dum-zahrada', name: 'Dům a zahrada', icon: 'flower',
    filters: [{ key: 'delivery', label: 'Možnost dovozu', type: 'boolean' }],
    children: [
      { slug: 'zahradni-technika', name: 'Zahradní technika' },
      { slug: 'zahradni-nabytek', name: 'Zahradní nábytek' },
      { slug: 'rostliny', name: 'Rostliny a semena' },
      { slug: 'stavebniny', name: 'Stavebniny' },
      { slug: 'vytapeni', name: 'Vytápění a klimatizace' },
      { slug: 'bazeny', name: 'Bazény a vířivky' },
    ],
  },
  {
    slug: 'obleceni', name: 'Oblečení a obuv', icon: 'shirt',
    filters: [
      { key: 'gender', label: 'Pro koho', type: 'select', options: ['Dámské', 'Pánské', 'Unisex'] },
      size(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']),
      brand(['Nike', 'Adidas', 'Zara', 'H&M', 'Puma', 'The North Face', 'Levi\'s', 'Jiná']),
    ],
    children: [
      { slug: 'damske', name: 'Dámské oblečení' },
      { slug: 'panske', name: 'Pánské oblečení' },
      { slug: 'obuv', name: 'Obuv', filters: [size(['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'], 'Velikost bot')] },
      { slug: 'doplnky', name: 'Doplňky a šperky' },
      { slug: 'kabelky', name: 'Kabelky a tašky' },
    ],
  },
  {
    slug: 'deti', name: 'Děti a kojenecké potřeby', icon: 'baby',
    filters: [{ key: 'age', label: 'Věk dítěte', type: 'select', options: ['0–6 měsíců', '6–12 měsíců', '1–3 roky', '3–6 let', '6–10 let', '10+ let'] }],
    children: [
      { slug: 'kocarky', name: 'Kočárky' },
      { slug: 'autosedacky', name: 'Autosedačky' },
      { slug: 'detske-obleceni', name: 'Dětské oblečení', filters: [size(['50', '56', '62', '68', '74', '80', '86', '92', '98', '104', '110', '116', '122', '128', '134', '140', '146', '152'])] },
      { slug: 'hracky', name: 'Hračky' },
      { slug: 'detsky-nabytek', name: 'Dětský nábytek' },
    ],
  },
  {
    slug: 'sport', name: 'Sport a volný čas', icon: 'bike',
    filters: [brand(['Specialized', 'Trek', 'Author', 'Kellys', 'Head', 'Atomic', 'Salomon', 'Jiná'])],
    children: [
      { slug: 'cyklistika', name: 'Cyklistika', filters: [{ key: 'frame', label: 'Velikost rámu', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL'] }, { key: 'wheel', label: 'Velikost kol', type: 'select', options: ['20"', '24"', '26"', '27,5"', '29"', '700c'] }] },
      { slug: 'zimni-sporty', name: 'Zimní sporty' },
      { slug: 'fitness', name: 'Fitness a posilování' },
      { slug: 'turistika', name: 'Turistika a kempování' },
      { slug: 'vodni-sporty', name: 'Vodní sporty' },
      { slug: 'micove-sporty', name: 'Míčové sporty' },
    ],
  },
  {
    slug: 'zvirata', name: 'Zvířata a chovatelské potřeby', icon: 'paw-print',
    filters: [{ key: 'pedigree', label: 'S průkazem původu', type: 'boolean' }, { key: 'sex', label: 'Pohlaví', type: 'select', options: ['Samec', 'Samice'] }],
    children: [
      { slug: 'psi', name: 'Psi' },
      { slug: 'kocky', name: 'Kočky' },
      { slug: 'hlodavci', name: 'Hlodavci' },
      { slug: 'ptaci', name: 'Ptáci' },
      { slug: 'akvaristika', name: 'Akvaristika a teraristika' },
      { slug: 'chovatelske-potreby', name: 'Chovatelské potřeby', filters: [] },
    ],
  },
  {
    slug: 'prace', name: 'Práce a brigády', icon: 'briefcase',
    filters: [
      { key: 'jobType', label: 'Typ úvazku', type: 'multiselect', options: ['Plný úvazek', 'Částečný úvazek', 'Brigáda', 'DPP/DPČ', 'IČO', 'Home office'] },
      { key: 'salary', label: 'Mzda', type: 'range', unit: 'Kč/měs.', min: 0, max: 200000 },
    ],
    children: [
      { slug: 'nabidka-prace', name: 'Nabídka práce' },
      { slug: 'brigady', name: 'Brigády' },
      { slug: 'hledam-praci', name: 'Hledám práci' },
    ],
  },
  {
    slug: 'sluzby', name: 'Služby a řemesla', icon: 'wrench',
    filters: [{ key: 'area', label: 'Působnost', type: 'select', options: ['Místní', 'Celý kraj', 'Celá ČR', 'Online'] }],
    children: [
      { slug: 'remesla', name: 'Řemesla a opravy' },
      { slug: 'stehovani', name: 'Stěhování a doprava' },
      { slug: 'uklid', name: 'Úklid' },
      { slug: 'douceni', name: 'Doučování a kurzy' },
      { slug: 'krasa', name: 'Krása a zdraví' },
      { slug: 'it-sluzby', name: 'IT a web' },
    ],
  },
  {
    slug: 'stroje-naradi', name: 'Stroje a nářadí', icon: 'drill',
    filters: [brand(['Bosch', 'Makita', 'DeWalt', 'Milwaukee', 'Metabo', 'Hilti', 'Stihl', 'Husqvarna', 'Jiná']), { key: 'power', label: 'Napájení', type: 'select', options: ['Aku', 'Síť', 'Benzín', 'Ruční'] }],
    children: [
      { slug: 'elektricke-naradi', name: 'Elektrické nářadí' },
      { slug: 'rucni-naradi', name: 'Ruční nářadí' },
      { slug: 'stavebni-stroje', name: 'Stavební stroje' },
      { slug: 'zemedelske-stroje', name: 'Zemědělské stroje' },
      { slug: 'dilna', name: 'Dílenské vybavení' },
    ],
  },
  {
    slug: 'hudba', name: 'Hudba a hudební nástroje', icon: 'music',
    filters: [brand(['Yamaha', 'Fender', 'Gibson', 'Roland', 'Korg', 'Ibanez', 'Pearl', 'Jiná'])],
    children: [
      { slug: 'kytary', name: 'Kytary a baskytary' },
      { slug: 'klavesy', name: 'Klávesy a piana' },
      { slug: 'bici', name: 'Bicí nástroje' },
      { slug: 'dechove', name: 'Dechové nástroje' },
      { slug: 'studio', name: 'Studio a ozvučení' },
      { slug: 'desky', name: 'Desky, CD a noty' },
    ],
  },
  {
    slug: 'sberatelstvi', name: 'Sběratelství a starožitnosti', icon: 'gem',
    filters: [{ key: 'era', label: 'Období', type: 'select', options: ['Před 1900', '1900–1945', '1945–1989', 'Po 1989'] }],
    children: [
      { slug: 'mince', name: 'Mince a bankovky' },
      { slug: 'znamky', name: 'Známky' },
      { slug: 'starozitnosti', name: 'Starožitnosti' },
      { slug: 'umeni', name: 'Obrazy a umění' },
      { slug: 'modely', name: 'Modely a figurky' },
      { slug: 'stare-knihy', name: 'Staré knihy a komiksy' },
    ],
  },
  {
    slug: 'knihy', name: 'Knihy a učebnice', icon: 'book-open',
    filters: [{ key: 'bookLang', label: 'Jazyk', type: 'select', options: ['Čeština', 'Slovenština', 'Angličtina', 'Němčina', 'Jiný'] }, { key: 'binding', label: 'Vazba', type: 'select', options: ['Pevná', 'Brožovaná', 'E-kniha', 'Audiokniha'] }],
    children: [
      { slug: 'beletrie', name: 'Beletrie' },
      { slug: 'ucebnice', name: 'Učebnice a skripta' },
      { slug: 'odborna', name: 'Odborná literatura' },
      { slug: 'detske-knihy', name: 'Dětské knihy' },
      { slug: 'komiksy', name: 'Komiksy a manga' },
      { slug: 'casopisy', name: 'Časopisy' },
    ],
  },
  {
    slug: 'hobby', name: 'Hobby a volný čas', icon: 'palette',
    filters: [],
    children: [
      { slug: 'deskovky', name: 'Deskové a karetní hry' },
      { slug: 'modelarstvi', name: 'Modelářství' },
      { slug: 'rucni-prace', name: 'Ruční práce a výtvarné potřeby' },
      { slug: 'rybareni', name: 'Rybaření' },
      { slug: 'myslivost', name: 'Myslivost' },
      { slug: 'vstupenky-zazitky', name: 'Zážitky a cestování' },
    ],
  },
  {
    slug: 'potraviny', name: 'Potraviny a zemědělství', icon: 'wheat',
    filters: [{ key: 'bio', label: 'Bio / farmářské', type: 'select', options: ['Ano', 'Ne'] }],
    children: [
      { slug: 'farmarske', name: 'Farmářské potraviny' },
      { slug: 'ovoce-zelenina', name: 'Ovoce a zelenina' },
      { slug: 'med', name: 'Med a včelí produkty' },
      { slug: 'hospodarska-zvirata', name: 'Hospodářská zvířata' },
      { slug: 'zemedelska-technika', name: 'Zemědělská technika' },
      { slug: 'osiva-sazenice', name: 'Osiva, sazenice a krmiva' },
    ],
  },
  {
    slug: 'ostatni', name: 'Ostatní', icon: 'shapes',
    filters: [],
    children: [
      { slug: 'vstupenky', name: 'Vstupenky a poukazy' },
      { slug: 'darujeme', name: 'Daruji zdarma' },
      { slug: 'vymena', name: 'Výměna' },
      { slug: 'ruzne', name: 'Různé' },
    ],
  },
];

export const CONDITIONS = [
  { value: 'NEW', label: 'Nové' },
  { value: 'LIKE_NEW', label: 'Jako nové' },
  { value: 'USED', label: 'Použité' },
  { value: 'DAMAGED', label: 'Poškozené' },
] as const;

export const OFFER_TYPES = [
  { value: 'SELL', label: 'Prodám' },
  { value: 'BUY', label: 'Koupím' },
  { value: 'EXCHANGE', label: 'Vyměním' },
  { value: 'GIVE', label: 'Daruji' },
  { value: 'RENT', label: 'Pronajmu' },
] as const;

export type Condition = (typeof CONDITIONS)[number]['value'];
export type OfferType = (typeof OFFER_TYPES)[number]['value'];

/** Filtry platné pro danou (pod)kategorii: filtry rodiče + vlastní filtry podkategorie. */
export function filtersFor(categorySlug: string, subSlug?: string): FilterDef[] {
  const cat = CATEGORIES.find((c) => c.slug === categorySlug);
  if (!cat) return [];
  const sub = subSlug ? cat.children.find((s) => s.slug === subSlug) : undefined;
  if (sub?.filters && sub.filters.length === 0) return [];
  const own = sub?.filters ?? [];
  const ownKeys = new Set(own.map((f) => f.key));
  return [...cat.filters.filter((f) => !ownKeys.has(f.key)), ...own];
}
