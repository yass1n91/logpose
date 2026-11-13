import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hacher, verifier, validerCompte } from '../src/auth.js';

test('le hachage utilise un sel différent et vérifie le mot de passe', async () => {
  const a = await hacher('UnSecretDeTest_123');
  const b = await hacher('UnSecretDeTest_123');
  assert.notEqual(a, b);
  assert.equal(await verifier('UnSecretDeTest_123', a), true);
  assert.equal(await verifier('unAutreSecret_123', a), false);
  assert.equal(a.includes('UnSecretDeTest'), false);
});

test('les identifiants et mots de passe invalides sont refusés', () => {
  assert.doesNotThrow(() => validerCompte('Luffy_91', 'MotDePasse123'));
  for (const nom of ['ab', 'avec espace', '<script>', 'x'.repeat(25)]) assert.throws(() => validerCompte(nom, 'MotDePasse123'));
  for (const mdp of ['', 'court', 'x'.repeat(129), null]) assert.throws(() => validerCompte('Luffy_91', mdp));
});
