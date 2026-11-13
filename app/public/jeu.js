import { $, api, message, pieces } from './commun.js';
let etat;
let clicsEnAttente = 0;
let envoi = false;
function afficher(compte) {
  etat = compte; pieces(compte);
  $('solde-jeu').textContent = compte.pieces.toLocaleString('fr-FR');
  $('force-jeu').textContent = compte.force;
  $('revenu-jeu').textContent = compte.revenu;
  $('energie').value = compte.energie;
  for (const type of ['canon', 'equipage']) {
    $(`niveau-${type}`).textContent = compte[type].niveau;
    $(`prix-${type}`).textContent = compte[type].prix.toLocaleString('fr-FR');
    $(`ameliorer-${type}`).disabled = compte.pieces < compte[type].prix || compte[type].niveau >= 15;
  }
}
$('canon').addEventListener('click', () => {
  if (!etat || clicsEnAttente >= 20) return;
  clicsEnAttente++;
  const effet = document.createElement('span'); effet.className = 'gain'; effet.textContent = `+${etat.force}`;
  $('zone-clic').append(effet); setTimeout(() => effet.remove(), 800);
  $('canon').classList.remove('impact'); void $('canon').offsetWidth; $('canon').classList.add('impact');
});
setInterval(async () => {
  if (!clicsEnAttente || envoi) return;
  envoi = true; const nombre = clicsEnAttente; clicsEnAttente = 0;
  try { afficher(await api('/jeu/clics', { method: 'POST', body: { clics: nombre } })); }
  catch (exception) { message(exception.message, true); }
  finally { envoi = false; }
}, 500);
setInterval(async () => {
  if (envoi || clicsEnAttente || document.hidden) return;
  try { afficher(await api('/jeu')); } catch (exception) { message(exception.message, true); }
}, 3000);
for (const type of ['canon', 'equipage']) {
  $(`ameliorer-${type}`).addEventListener('click', async () => {
    $(`ameliorer-${type}`).disabled = true;
    try { afficher(await api('/jeu/ameliorations', { method: 'POST', body: { type } })); message(type === 'canon' ? 'Canon amélioré !' : 'Un nouveau membre rejoint votre équipage.'); }
    catch (exception) { message(exception.message, true); if (etat) afficher(etat); }
  });
}
addEventListener('pagehide', () => {
  if (clicsEnAttente) fetch('/api/jeu/clics', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clics: clicsEnAttente }) }).catch(() => {});
});
api('/jeu').then(afficher).catch(exception => message(exception.message, true));
