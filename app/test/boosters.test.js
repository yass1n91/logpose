import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tirerBooster } from '../src/tirage.js';
import catalogue from '../data/op01.json' with { type: 'json' };

test('chaque booster contient douze cartes OP01 différentes et illustrées', () => {
  const codes = new Set(catalogue.map(c => c.code));
  for (let i = 0; i < 100; i++) {
    const cartes = tirerBooster();
    assert.equal(cartes.length, 12);
    assert.equal(new Set(cartes.map(c => c.code)).size, 12);
    for (const carte of cartes) {
      assert.ok(codes.has(carte.code));
      assert.match(carte.image, /^https:\/\/optcgapi.com\/media\//);
    }
    assert.equal(cartes.filter(c => c.rarete === 'C').length, 6);
    assert.equal(cartes.filter(c => c.rarete === 'UC').length, 3);
    assert.ok(['R', 'SR', 'SEC'].includes(cartes[11].rarete));
  }
});
