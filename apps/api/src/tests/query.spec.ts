import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { fromSearchString as fromSearchStringRaw, parseNaturalQuery, toSearchString, type SearchParams } from '@dej/shared';

describe('parseNaturalQuery (chytré hledání)', () => {
  it('rozpozná cenu a město', () => {
    const { params, recognized } = parseNaturalQuery('iPhone 15 Pro do 15 000 Kč Praha');
    assert.deepEqual(params, { q: 'iPhone 15 Pro', priceMax: 15000, city: 'Praha' });
    // čísla formátuje Intl s nezlomitelnou mezerou
    assert.deepEqual(recognized.map((r) => r.replace(/\s/g, ' ')), ['do 15 000 Kč', 'Praha']);
  });

  it('rozpozná skloňované město', () => {
    assert.deepEqual(parseNaturalQuery('kolo v Brně').params, { q: 'kolo', city: 'Brno' });
  });

  it('rozpozná stav a minimální cenu', () => {
    assert.deepEqual(parseNaturalQuery('notebook nový od 5000 Kč').params, { q: 'notebook', priceMin: 5000, condition: ['NEW'] });
  });

  it('rozpozná typ nabídky', () => {
    assert.equal(parseNaturalQuery('sedačka zdarma').params.offerType, 'GIVE');
    assert.equal(parseNaturalQuery('byty pronájem Ostrava').params.offerType, 'RENT');
  });

  it('rozpozná podkategorii', () => {
    const { params } = parseNaturalQuery('kočárky použitý');
    assert.equal(params.category, 'deti');
    assert.equal(params.sub, 'kocarky');
    assert.equal(params.q, undefined);
  });

  it('obyčejný text nechá beze změny', () => {
    assert.deepEqual(parseNaturalQuery('lego technic').params, { q: 'lego technic' });
  });
});

/** fromSearchString vrací i klíče s hodnotou undefined – pro porovnání je vynecháme. */
const fromSearchString = (input: Parameters<typeof fromSearchStringRaw>[0]) =>
  JSON.parse(JSON.stringify(fromSearchStringRaw(input))) as SearchParams;

describe('toSearchString / fromSearchString', () => {
  it('převede parametry do URL a zpět beze ztráty', () => {
    const p: SearchParams = {
      q: 'kolo', category: 'sport', priceMin: 100, priceMax: 5000, condition: ['NEW', 'USED'], sort: 'newest', page: 2,
      attrs: { rok: { min: 2010, max: 2020 }, znacka: 'Trek', abs: true },
    };
    const s = toSearchString(p);
    assert.match(s, /cena_do=5000/);
    assert.deepEqual(fromSearchString(new URLSearchParams(s)), p);
  });

  it('vynechá výchozí řazení a první stranu', () => {
    assert.equal(toSearchString({ q: 'kolo', sort: 'relevance', page: 1 }), 'q=kolo');
  });

  it('přijme i objekt z Next.js searchParams', () => {
    assert.deepEqual(fromSearchString({ q: 'auto', cena_od: '1000', stav: ['USED'] }), { q: 'auto', priceMin: 1000, condition: ['USED'] });
  });
});
