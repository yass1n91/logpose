import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decouperNom, normaliser } from '../src/catalogue.js';

test('le nom renvoyé par le catalogue est séparé de la version', () => {
  assert.deepEqual(decouperNom('Roronoa Zoro (001)'), { nom: 'Roronoa Zoro', version: 'Standard' });
  assert.deepEqual(decouperNom('Monkey.D.Luffy (119) (Alternate Art) (Manga)'), {
    nom: 'Monkey.D.Luffy',
    version: 'Alternate Art, Manga',
  });
  assert.deepEqual(decouperNom('Gol.D.Roger - OP09-118 (SP) (Wanted Poster)'), {
    nom: 'Gol.D.Roger',
    version: 'SP, Wanted Poster',
  });
  assert.deepEqual(decouperNom('Nami (OP01-016) (Manga)'), { nom: 'Nami', version: 'Manga' });
  assert.deepEqual(decouperNom('Mr.2.Bon.Kurei(Bentham)'), { nom: 'Mr.2.Bon.Kurei(Bentham)', version: 'Standard' });
});

const law = {
  set_id: 'OP-01',
  rarity: 'L',
  card_set_id: 'OP01-002',
  card_color: 'Green Red',
  card_type: 'Leader',
  life: '4',
  card_cost: null,
  card_power: '5000',
  sub_types: 'Heart Pirates Supernovas',
  counter_amount: null,
  attribute: 'Slash',
  card_text: '[Activate:Main] [Once Per Turn] (2) : If you have 5 Characters, return 1 of your Characters to your hand.',
};
const tirages = [
  {
    ...law,
    card_name: 'Trafalgar Law (002) (Parallel)',
    market_price: 457.58,
    card_image_id: 'OP01-002_p1',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-002_p1.jpg',
  },
  {
    ...law,
    card_name: 'Trafalgar Law (002)',
    market_price: 2.1,
    card_image_id: 'OP01-002',
    card_image: 'https://optcgapi.com/media/static/Card_Images/OP01-002.jpg',
  },
];

test('la réponse du catalogue est traduite dans le vocabulaire du formulaire', () => {
  const fiche = normaliser('OP01-002', tirages);

  assert.equal(fiche.nom, 'Trafalgar Law');
  assert.equal(fiche.categorie, 'Leader');
  assert.deepEqual(fiche.couleurs, ['Vert', 'Rouge']);
  assert.equal(fiche.rarete, 'L');
  assert.equal(fiche.vie, 4);
  assert.equal(fiche.puissance, 5000);
  assert.equal(fiche.cout, null);
  assert.equal(fiche.contre, null);
  assert.equal(fiche.attribut, 'Tranche');
});

test("l'impression d'origine est proposée en premier", () => {
  const { versions } = normaliser('OP01-002', tirages);

  assert.deepEqual(versions, [
    { libelle: 'Standard', coteUsd: 2.1, image: 'https://optcgapi.com/media/static/Card_Images/OP01-002.jpg' },
    { libelle: 'Parallel', coteUsd: 457.58, image: 'https://optcgapi.com/media/static/Card_Images/OP01-002_p1.jpg' },
  ]);
});

test('les particularités du catalogue sont gommées', () => {
  const reedition = { ...tirages[1], set_id: 'PRB-01', market_price: 0.4, card_image_id: 'OP01-002_r1' };
  const doublon = { ...tirages[0], market_price: 500 };
  const bizarre = { ...tirages[1], rarity: 'PR', card_cost: 'NULL', counter_amount: 0, attribute: 'NULL' };

  const fiche = normaliser('OP01-002', [doublon, tirages[0], reedition, bizarre]);

  assert.equal(fiche.rarete, 'P');
  assert.equal(fiche.cout, null);
  assert.equal(fiche.contre, null);
  assert.equal(fiche.attribut, null);
  assert.deepEqual(
    fiche.versions.map((v) => [v.libelle, v.coteUsd]),
    [
      ['Standard', 2.1],
      ['Standard (PRB-01)', 0.4],
      ['Parallel', 457.58],
    ],
  );
});
