import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculerRecolte, coutAmelioration, publicCompte } from '../src/economie.js';

test('les revenus passifs utilisent le temps serveur et sont limités à huit heures', () => {
  const date = new Date('2026-01-01T00:00:00Z');
  const compte = { pieces: 10, niveau_equipage: 2, recolte_le: date };
  assert.equal(calculerRecolte(compte, new Date(date.getTime() + 2500)), 14);
  assert.equal(calculerRecolte(compte, new Date(date.getTime() + 86400000)), 57610);
  assert.equal(calculerRecolte(compte, new Date(date.getTime() - 1000)), 10);
  assert.equal(calculerRecolte({ ...compte, pieces: 999999999 }, new Date(date.getTime() + 10000)), 1000000000);
});

test('le portefeuille public ne contient aucune information de connexion', () => {
  const compte = publicCompte({ pieces: 30, niveau_canon: 2, niveau_equipage: 1, energie: 19.8, clics_total: '40', mot_de_passe: 'secret' });
  assert.equal(compte.force, 3);
  assert.equal(compte.canon.prix, coutAmelioration('canon', 2));
  assert.equal(compte.clics, 40);
  assert.equal('mot_de_passe' in compte, false);
});
