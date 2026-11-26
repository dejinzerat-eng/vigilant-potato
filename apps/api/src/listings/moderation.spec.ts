import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { assessListing, assessMessage } from './moderation';

const listing = (title: string, description = 'Popis inzerátu', extra: Partial<Parameters<typeof assessListing>[0]> = {}) =>
  assessListing({ title, description, ...extra });

describe('assessListing', () => {
  it('nechá běžný inzerát bez bodů', () => {
    assert.deepEqual(listing('Silniční kolo Trek Domane, 56 cm'), { score: 0, reasons: [] });
  });

  it('zachytí zakázané zboží', () => {
    for (const title of ['Prodám pistol Glock', 'Revolver po dědovi', 'Marihuana skladem']) {
      const r = listing(title);
      assert.ok(r.score >= 80, title);
      assert.ok(r.reasons.includes('Možný zakázaný obsah'), title);
    }
  });

  it('zachytí i skloňované tvary', () => {
    for (const title of ['Prodám pistoli', 'Kokainu dost', 'Starý revolveru podobný']) assert.ok(listing(title).score >= 80, title);
  });

  it('zachytí slova končící diakritikou (zbraň, extáz)', () => {
    assert.ok(listing('Zbraň na prodej').score >= 80);
    assert.ok(listing('Párty', 'Nabízím extáz').score >= 80);
  });

  it('nezachytí zakázaný kmen uprostřed jiného slova', () => {
    assert.equal(listing('Kniha Bezdrogová výchova', 'Pro rodiče').score, 0);
  });

  it('pozná znaky podvodu', () => {
    const r = listing('iPhone 15', 'Platba přes Western Union, pošlu kurýrem po zaplacení');
    assert.ok(r.reasons.includes('Znaky podvodného inzerátu'));
    assert.ok(r.score >= 50);
  });

  it('boduje mnoho odkazů, velká písmena a opakované znaky', () => {
    assert.ok(listing('Kolo', 'https://a.cz https://b.cz https://c.cz').reasons.includes('Mnoho odkazů'));
    assert.ok(listing('PRODÁM AUTO HNED TEĎ').reasons.includes('Nadpis velkými písmeny'));
    assert.ok(listing('Kolo!!!!!!!!').reasons.includes('Opakované znaky'));
  });

  it('označí podezřele nízkou cenu jen u aut a realit', () => {
    assert.ok(listing('Škoda Octavia', 'x', { price: 50, categorySlug: 'auto-moto' }).reasons.includes('Podezřele nízká cena'));
    assert.equal(listing('Hrnek', 'x', { price: 50, categorySlug: 'dum-zahrada' }).score, 0);
  });

  it('nepřekročí skóre 100', () => {
    const r = listing('PISTOL A MUNICE LEVNĚ!!!!!!!', 'western union https://a https://b https://c', { price: 10, categorySlug: 'auto-moto' });
    assert.equal(r.score, 100);
  });
});

describe('assessMessage', () => {
  it('varuje u podezřelé zprávy', () => {
    assert.match(assessMessage('Pošlete peníze přes Western Union') ?? '', /podvod/);
  });
  it('u běžné zprávy nevaruje', () => {
    assert.equal(assessMessage('Dobrý den, je kolo ještě k mání?'), null);
  });
});
