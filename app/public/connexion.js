import { $, api, utilisateur } from './commun.js';
let inscription = false;
const autorisees = ['/', '/index.html', '/ajouter.html', '/boosters.html', '/virtuelles.html', '/jeu.html', '/compte.html'];
const suivant = new URLSearchParams(location.search).get('suivant');
const destination = autorisees.includes(suivant) ? suivant : '/';
if (utilisateur) location.replace(destination);
for (const [id, mode] of [['mode-connexion', false], ['mode-inscription', true]]) $(id).addEventListener('click', () => {
  inscription = mode;
  $('mode-connexion').setAttribute('aria-pressed', String(!mode));
  $('mode-inscription').setAttribute('aria-pressed', String(mode));
  $('mot-de-passe').autocomplete = mode ? 'new-password' : 'current-password';
  $('envoyer-compte').textContent = mode ? 'Créer mon compte' : 'Me connecter';
  $('erreur-compte').textContent = '';
});
$('connexion').addEventListener('submit', async evenement => {
  evenement.preventDefault(); $('envoyer-compte').disabled = true; $('erreur-compte').textContent = '';
  try {
    await api(`/auth/${inscription ? 'inscription' : 'connexion'}`, { method: 'POST', body: { nom: $('identifiant').value.trim(), motDePasse: $('mot-de-passe').value } });
    location.replace(destination);
  } catch (exception) { $('erreur-compte').textContent = exception.message; $('envoyer-compte').disabled = false; }
});
