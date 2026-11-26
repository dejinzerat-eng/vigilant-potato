/** Kraje ČR a SR a větší města se souřadnicemi (pro vyhledávání podle vzdálenosti). */

export interface Region { code: string; name: string; country: 'CZ' | 'SK' }
export interface City { name: string; region: string; lat: number; lng: number; zip: string }

export const REGIONS: Region[] = [
  { code: 'PHA', name: 'Hlavní město Praha', country: 'CZ' },
  { code: 'STC', name: 'Středočeský kraj', country: 'CZ' },
  { code: 'JHC', name: 'Jihočeský kraj', country: 'CZ' },
  { code: 'PLK', name: 'Plzeňský kraj', country: 'CZ' },
  { code: 'KVK', name: 'Karlovarský kraj', country: 'CZ' },
  { code: 'ULK', name: 'Ústecký kraj', country: 'CZ' },
  { code: 'LBK', name: 'Liberecký kraj', country: 'CZ' },
  { code: 'HKK', name: 'Královéhradecký kraj', country: 'CZ' },
  { code: 'PAK', name: 'Pardubický kraj', country: 'CZ' },
  { code: 'VYS', name: 'Kraj Vysočina', country: 'CZ' },
  { code: 'JHM', name: 'Jihomoravský kraj', country: 'CZ' },
  { code: 'OLK', name: 'Olomoucký kraj', country: 'CZ' },
  { code: 'ZLK', name: 'Zlínský kraj', country: 'CZ' },
  { code: 'MSK', name: 'Moravskoslezský kraj', country: 'CZ' },
  { code: 'BA', name: 'Bratislavský kraj', country: 'SK' },
  { code: 'TT', name: 'Trnavský kraj', country: 'SK' },
  { code: 'NR', name: 'Nitriansky kraj', country: 'SK' },
  { code: 'TN', name: 'Trenčiansky kraj', country: 'SK' },
  { code: 'ZA', name: 'Žilinský kraj', country: 'SK' },
  { code: 'BB', name: 'Banskobystrický kraj', country: 'SK' },
  { code: 'PO', name: 'Prešovský kraj', country: 'SK' },
  { code: 'KE', name: 'Košický kraj', country: 'SK' },
];

export const CITIES: City[] = [
  { name: 'Praha', region: 'PHA', lat: 50.0755, lng: 14.4378, zip: '11000' },
  { name: 'Kladno', region: 'STC', lat: 50.1473, lng: 14.1029, zip: '27201' },
  { name: 'Mladá Boleslav', region: 'STC', lat: 50.4113, lng: 14.9032, zip: '29301' },
  { name: 'Kolín', region: 'STC', lat: 50.0281, lng: 15.2006, zip: '28002' },
  { name: 'Příbram', region: 'STC', lat: 49.6899, lng: 14.0104, zip: '26101' },
  { name: 'Benešov', region: 'STC', lat: 49.7817, lng: 14.6869, zip: '25601' },
  { name: 'České Budějovice', region: 'JHC', lat: 48.9745, lng: 14.4743, zip: '37001' },
  { name: 'Tábor', region: 'JHC', lat: 49.4144, lng: 14.6578, zip: '39002' },
  { name: 'Písek', region: 'JHC', lat: 49.3088, lng: 14.1475, zip: '39701' },
  { name: 'Plzeň', region: 'PLK', lat: 49.7384, lng: 13.3736, zip: '30100' },
  { name: 'Klatovy', region: 'PLK', lat: 49.3955, lng: 13.2951, zip: '33901' },
  { name: 'Karlovy Vary', region: 'KVK', lat: 50.2319, lng: 12.8720, zip: '36001' },
  { name: 'Cheb', region: 'KVK', lat: 50.0796, lng: 12.3739, zip: '35002' },
  { name: 'Ústí nad Labem', region: 'ULK', lat: 50.6607, lng: 14.0323, zip: '40001' },
  { name: 'Teplice', region: 'ULK', lat: 50.6404, lng: 13.8245, zip: '41501' },
  { name: 'Most', region: 'ULK', lat: 50.5030, lng: 13.6362, zip: '43401' },
  { name: 'Děčín', region: 'ULK', lat: 50.7822, lng: 14.2148, zip: '40502' },
  { name: 'Liberec', region: 'LBK', lat: 50.7663, lng: 15.0543, zip: '46001' },
  { name: 'Jablonec nad Nisou', region: 'LBK', lat: 50.7243, lng: 15.1711, zip: '46601' },
  { name: 'Hradec Králové', region: 'HKK', lat: 50.2092, lng: 15.8328, zip: '50002' },
  { name: 'Trutnov', region: 'HKK', lat: 50.5610, lng: 15.9127, zip: '54101' },
  { name: 'Pardubice', region: 'PAK', lat: 50.0343, lng: 15.7812, zip: '53002' },
  { name: 'Chrudim', region: 'PAK', lat: 49.9511, lng: 15.7956, zip: '53701' },
  { name: 'Jihlava', region: 'VYS', lat: 49.3961, lng: 15.5912, zip: '58601' },
  { name: 'Třebíč', region: 'VYS', lat: 49.2148, lng: 15.8817, zip: '67401' },
  { name: 'Brno', region: 'JHM', lat: 49.1951, lng: 16.6068, zip: '60200' },
  { name: 'Znojmo', region: 'JHM', lat: 48.8555, lng: 16.0488, zip: '66902' },
  { name: 'Břeclav', region: 'JHM', lat: 48.7590, lng: 16.8820, zip: '69002' },
  { name: 'Olomouc', region: 'OLK', lat: 49.5938, lng: 17.2509, zip: '77900' },
  { name: 'Prostějov', region: 'OLK', lat: 49.4719, lng: 17.1118, zip: '79601' },
  { name: 'Přerov', region: 'OLK', lat: 49.4551, lng: 17.4509, zip: '75002' },
  { name: 'Zlín', region: 'ZLK', lat: 49.2265, lng: 17.6707, zip: '76001' },
  { name: 'Uherské Hradiště', region: 'ZLK', lat: 49.0698, lng: 17.4597, zip: '68601' },
  { name: 'Ostrava', region: 'MSK', lat: 49.8209, lng: 18.2625, zip: '70200' },
  { name: 'Opava', region: 'MSK', lat: 49.9387, lng: 17.9026, zip: '74601' },
  { name: 'Frýdek-Místek', region: 'MSK', lat: 49.6880, lng: 18.3501, zip: '73801' },
  { name: 'Karviná', region: 'MSK', lat: 49.8540, lng: 18.5417, zip: '73301' },
  { name: 'Havířov', region: 'MSK', lat: 49.7798, lng: 18.4369, zip: '73601' },
  { name: 'Bratislava', region: 'BA', lat: 48.1486, lng: 17.1077, zip: '81101' },
  { name: 'Trnava', region: 'TT', lat: 48.3774, lng: 17.5883, zip: '91701' },
  { name: 'Nitra', region: 'NR', lat: 48.3069, lng: 18.0864, zip: '94901' },
  { name: 'Trenčín', region: 'TN', lat: 48.8945, lng: 18.0444, zip: '91101' },
  { name: 'Žilina', region: 'ZA', lat: 49.2231, lng: 18.7394, zip: '01001' },
  { name: 'Banská Bystrica', region: 'BB', lat: 48.7395, lng: 19.1535, zip: '97401' },
  { name: 'Prešov', region: 'PO', lat: 48.9985, lng: 21.2339, zip: '08001' },
  { name: 'Košice', region: 'KE', lat: 48.7164, lng: 21.2611, zip: '04001' },
];

export function regionName(code: string): string {
  return REGIONS.find((r) => r.code === code)?.name ?? code;
}

export function findCity(name: string): City | undefined {
  const n = normalize(name);
  return CITIES.find((c) => normalize(c.name) === n);
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function slugify(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function formatPrice(price: number | null | undefined, negotiable = false, currency = 'CZK'): string {
  if (price == null) return negotiable ? 'Dohodou' : 'Zdarma';
  if (price === 0) return 'Zdarma';
  const s = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(price);
  return `${s} ${currency === 'EUR' ? '€' : 'Kč'}`;
}
