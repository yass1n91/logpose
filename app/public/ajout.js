import { $, api, message, euros } from './commun.js';
let fiche;
let minuterie;
let requete = 0;
const formulaire = $('formulaire');
function choisirVersion() {
  const version = fiche?.versions.find(element => element.libelle === $('version').value);
  $('apercu-image').hidden = !version?.image;
  if (version?.image) $('apercu-image').src = version.image;
  if (version?.prixEur != null) {
    $('prix').value = version.prixEur.toFixed(2);
    $('cote').textContent = `Estimation ${euros.format(version.prixEur)} · cote TCGplayer ${version.coteUsd} $ · change du ${fiche.dateChange}. Modifiable selon l’état.`;
  } else {
    $('cote').textContent = version?.coteUsd != null ? `Cote TCGplayer : ${version.coteUsd} $. Saisissez votre prix en euros.` : 'Pas de cote disponible. Le prix reste facultatif.';
  }
  if (fiche?.horsLigne) $('cote').textContent += ' Fiche de secours en cache ; cote à vérifier.';
}
async function chercher() {
  const code = $('code').value.trim().toUpperCase();
  if (!code) return;
  const numero = ++requete;
  $('chercher').disabled = true; $('catalogue-info').textContent = 'Recherche de la fiche…';
  try {
    const resultat = await api(`/catalogue/${encodeURIComponent(code)}`);
    if (numero !== requete || $('code').value.trim().toUpperCase() !== code) return;
    fiche = resultat; $('nom').value = fiche.nom;
    $('version').replaceChildren(...fiche.versions.map(element => { const option = document.createElement('option'); option.value = element.libelle; option.textContent = element.libelle; return option; }));
    $('fiche-nom').textContent = fiche.nom;
    $('fiche-code').textContent = `${fiche.code} · ${fiche.rarete ?? ''}`;
    $('fiche-caracteristiques').textContent = [fiche.categorie, fiche.couleurs?.join(' / '), fiche.attribut, fiche.cout != null ? `Coût ${fiche.cout}` : '', fiche.puissance != null ? `Puissance ${fiche.puissance}` : '', fiche.vie != null ? `Vie ${fiche.vie}` : '', fiche.contre ? `Contre ${fiche.contre}` : '', fiche.types].filter(Boolean).join(' · ');
    $('fiche-effet').textContent = fiche.effet || 'Cette carte n’a pas de texte d’effet.';
    $('fiche-preview').hidden = false;
    choisirVersion(); $('catalogue-info').textContent = 'Fiche remplie. Vérifiez la version et votre estimation.';
  } catch (exception) { if (numero === requete) $('catalogue-info').textContent = `${exception.message} La saisie manuelle reste possible.`; }
  finally { $('chercher').disabled = false; }
}
$('code').addEventListener('input', () => {
  clearTimeout(minuterie); requete++;
  if (fiche) $('nom').value = '';
  fiche = undefined;
  $('fiche-preview').hidden = true; $('apercu-image').hidden = true;
  $('cote').textContent = ''; $('prix').value = '0';
  $('version').replaceChildren(new Option('Standard', 'Standard'));
  const valeur = $('code').value.trim().toUpperCase();
  minuterie = setTimeout(async () => {
    try {
      if (/^(?:(?:OP|EB|ST|PRB)\d{2}-\d{3}|P-\d{3})$/.test(valeur)) return await chercher();
      if (valeur.length < 3) return $('codes').replaceChildren();
      const suggestions = await api(`/catalogue?q=${encodeURIComponent(valeur)}`);
      if ($('code').value.trim().toUpperCase() !== valeur) return;
      $('codes').replaceChildren(...suggestions.map(carte => { const option = document.createElement('option'); option.value = carte.code; option.label = carte.nom; return option; }));
    } catch { $('codes').replaceChildren(); }
  }, 350);
});
$('chercher').addEventListener('click', chercher);
$('version').addEventListener('change', choisirVersion);
$('code').addEventListener('keydown', evenement => { if (evenement.key === 'Enter') { evenement.preventDefault(); clearTimeout(minuterie); chercher(); } });
formulaire.addEventListener('submit', async evenement => {
  evenement.preventDefault(); $('enregistrer').disabled = true; $('erreur-formulaire').textContent = '';
  const saisie = { ...(fiche ?? {}), ...Object.fromEntries(new FormData(formulaire)) };
  saisie.image = fiche?.versions.find(element => element.libelle === saisie.version)?.image ?? '';
  try {
    await api('/collection', { method: 'POST', body: saisie });
    formulaire.reset(); fiche = undefined; $('fiche-preview').hidden = true; $('apercu-image').hidden = true;
    $('cote').textContent = ''; $('etat').value = 'NM'; $('langue').value = 'FR';
    $('version').replaceChildren(new Option('Standard', 'Standard'));
    $('catalogue-info').textContent = 'La carte est enregistrée dans votre collection.';
    message('Carte ajoutée.'); $('code').focus();
  } catch (exception) { $('erreur-formulaire').textContent = Object.values(exception.erreurs ?? { message: exception.message }).join(' '); }
  finally { $('enregistrer').disabled = false; }
});
try {
  const referentiel = await api('/referentiel');
  for (const [champ, liste] of [['etat', referentiel.etats], ['langue', referentiel.langues]]) $(champ).replaceChildren(...liste.map(element => new Option(element.libelle, element.code)));
  $('etat').value = 'NM'; $('langue').value = 'FR';
} catch (exception) { message(exception.message, true); $('enregistrer').disabled = true; }
