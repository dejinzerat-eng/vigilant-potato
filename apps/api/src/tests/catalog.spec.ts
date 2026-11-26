import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CATEGORIES, CITIES, filtersFor, findCity, formatPrice, slugify } from '@dej/shared';

describe('kategorie', () => {
  it('je jich 20 podle specifikace v1.0', () => {
    assert.equal(CATEGORIES.length, 20);
  });

  it('mají unikátní slugy a každá má podkategorie', () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (const c of CATEGORIES) {
      assert.ok(c.children.length > 0, `${c.slug} nemá podkategorie`);
      const subs = c.children.map((s) => s.slug);
      assert.equal(new Set(subs).size, subs.length, `${c.slug} má duplicitní podkategorie`);
      for (const s of [c.slug, ...subs]) assert.match(s, /^[a-z0-9-]+$/, `neplatný slug ${s}`);
    }
  });

  it('filtersFor vrací filtry kategorie', () => {
    for (const c of CATEGORIES) assert.ok(Array.isArray(filtersFor(c.slug, c.children[0].slug)));
  });
});

describe('lokality a formátování', () => {
  it('najde město bez diakritiky', () => {
    assert.equal(findCity('plzen')?.name, 'Plzeň');
    assert.ok(CITIES.length > 0);
  });

  it('slugify odstraní diakritiku a znaky', () => {
    assert.equal(slugify('Žluťoučký kůň – úpěl!'), 'zlutoucky-kun-upel');
  });

  it('formatPrice', () => {
    assert.match(formatPrice(15000), /^15\s000\sKč$/);
    assert.equal(formatPrice(0), 'Zdarma');
    assert.equal(formatPrice(null), 'Zdarma');
    assert.equal(formatPrice(null, true), 'Dohodou');
  });
});
