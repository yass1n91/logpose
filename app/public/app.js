import { $, api, euros, message } from './commun.js';
const virtuelle = document.body.dataset.page === 'virtuelles';
let cartes = [];
function afficher() {
  const recherche = $('filtre').value.trim().toLocaleLowerCase('fr');
  const visibles = cartes.filter(exemplaire => `${exemplaire.code_carte} ${exemplaire.carte?.nom ?? ''}`.toLocaleLowerCase('fr').includes(recherche));
  $('nombre-cartes').textContent = `(${visibles.length})`;
  $('collection').replaceChildren();
  if (!visibles.length) {
    const paragraphe = document.createElement('paragraphe'); paragraphe.className = 'etat-vide';
    paragraphe.textContent = recherche ? 'Aucune carte ne correspond à cette recherche.' : virtuelle ? 'Ouvrez votre premier booster pour commencer cette collection.' : 'Ajoutez votre première carte depuis la page Ajouter.';
    $('collection').append(paragraphe); return;
  }
  for (const exemplaire of visibles) {
    const carte = $('modele-carte').content.firstElementChild.cloneNode(true);
    const nom = exemplaire.carte?.nom ?? exemplaire.code_carte;
    const img = carte.querySelector('img'); img.alt = nom;
    const repli = () => { img.hidden = true; carte.querySelector('.sans-image').hidden = false; };
    img.addEventListener('error', repli, { once: true });
    if (exemplaire.image_url) img.src = exemplaire.image_url; else repli();
    carte.querySelector('h3').textContent = nom;
    carte.querySelector('.code').textContent = exemplaire.code_carte;
    carte.querySelector('.rarete').textContent = exemplaire.carte?.rarete ?? '';
    carte.querySelector('.details-carte').textContent = virtuelle ? `${exemplaire.quantite} exemplaire${exemplaire.quantite > 1 ? 's' : ''} · ${exemplaire.edition}` : `${exemplaire.version} · ${exemplaire.etat_libelle} · ${exemplaire.langue} · ×${exemplaire.quantite}`;
    carte.querySelector('.prix').textContent = euros.format(exemplaire.prix_unitaire ?? 0);
    carte.querySelector('.carte-actions').hidden = virtuelle;
    const retirer = carte.querySelector('.retirer');
    retirer.setAttribute('aria-label', `Retirer ${nom}`);
    retirer.addEventListener('click', async () => {
      if (!confirm(`Retirer ${nom} ?`)) return;
      retirer.disabled = true;
      try { await api(`/collection/${exemplaire.id}`, { method: 'DELETE' }); await charger(); message('Carte retirée.'); }
      catch (exception) { retirer.disabled = false; message(exception.message, true); }
    });
    $('collection').append(carte);
  }
}
async function charger() {
  if (virtuelle) {
    const lignes = await api('/virtuelles');
    const groupes = new Map();
    for (const ligne of lignes) {
      const cle = `${ligne.edition}:${ligne.code_carte}`;
      if (groupes.has(cle)) groupes.get(cle).quantite++;
      else groupes.set(cle, { ...ligne, quantite: 1, image_url: ligne.carte?.image });
    }
    cartes = [...groupes.values()];
    $('resume-virtuel').textContent = `${lignes.length} cartes · ${new Set(lignes.map(ligne => ligne.ouverture_id)).size} boosters ouverts.`;
  } else {
    const resultat = await api('/collection'); cartes = resultat.exemplaires;
    $('stat-cartes').textContent = resultat.resume.cartes;
    $('stat-distinctes').textContent = resultat.resume.distinctes;
    $('stat-valeur').textContent = euros.format(resultat.resume.valeur);
  }
  afficher();
}
$('filtre').addEventListener('input', afficher);
charger().catch(exception => { $('collection').textContent = 'Chargement impossible.'; message(exception.message, true); });
