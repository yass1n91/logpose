import assert from 'node:assert/strict';
import { test } from 'node:test';
import { referentiel } from '../src/referentiel.js';
import { validerSaisie } from '../src/validation.js';

referentiel.etats = [{ code: 'NM' }, { code: 'EX' }];

test('le code et le nom suffisent pour ajouter une carte', () => {
  const resultat = validerSaisie({ code: 'op01-001', nom: ' Zoro ' });
  assert.equal(resultat.erreurs, undefined);
  assert.equal(resultat.fiche._id, 'OP01-001');
  assert.equal(resultat.fiche.nom, 'Zoro');
  assert.deepEqual(resultat.exemplaire, {
    codeCarte: 'OP01-001', version: 'Standard', etat: 'NM', langue: 'FR',
    quantite: 1, prixUnitaire: 0, imageUrl: null,
  });
});

test('les informations facultatives restent validées', () => {
  const { erreurs } = validerSaisie({ code: 'OP01-001', nom: 'Zoro', quantite: 0, prix: -1, etat: 'ZZ', langue: 'DE' });
  assert.deepEqual(Object.keys(erreurs).sort(), ['etat', 'langue', 'prix', 'quantite']);
  const { exemplaire } = validerSaisie({ code: 'OP01-001', nom: 'Zoro', prix: '2.899', quantite: 2, etat: 'EX' });
  assert.equal(exemplaire.prixUnitaire, 2.9);
  assert.equal(exemplaire.quantite, 2);
});

test('une saisie vide ou un code invalide est refusé', () => {
  for (const corps of [undefined, {}, 'texte']) assert.ok(validerSaisie(corps).erreurs.nom);
  assert.ok(validerSaisie({ code: 'OP1-1', nom: 'Zoro' }).erreurs.code);
});

test('les codes des starters et promotions sont acceptés', () => {
  for (const code of ['ST01-001', 'EB01-001', 'PRB01-001', 'P-001']) {
    assert.equal(validerSaisie({ code, nom: 'Carte' }).erreurs, undefined);
  }
});

test('une illustration extérieure au catalogue est ignorée', () => {
  const corps = { code: 'OP01-001', nom: 'Zoro' };
  assert.equal(validerSaisie({ ...corps, image: 'https://ailleurs.test/a.png' }).exemplaire.imageUrl, null);
  const image = 'https://optcgapi.com/media/static/Card_Images/OP01-001.jpg';
  assert.equal(validerSaisie({ ...corps, image }).exemplaire.imageUrl, image);
});
