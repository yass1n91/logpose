import { $, api, message, pieces } from './commun.js';
let idEnCours;
let chargement = false;
function reveler(bouton) {
  if (bouton.classList.contains('revelee')) return;
  bouton.classList.add('revelee'); bouton.setAttribute('aria-label', bouton.dataset.nom);
  bouton.querySelector('.face').setAttribute('aria-hidden', 'false');
  if (!$('tirage').querySelector('.carte-tirage:not(.revelee)')) {
    $('tout-reveler').hidden = true;
    $('ouvrir').disabled = false; $('ouvrir').textContent = 'Ouvrir un autre booster · 100 pièces';
    $('titre-ouverture').textContent = 'Votre booster est enregistré.';
  }
}
$('tout-reveler').addEventListener('click', () => $('tirage').querySelectorAll('.carte-tirage').forEach(reveler));
$('edition').addEventListener('change', () => {
  idEnCours = undefined;
  $('pack-code').textContent = $('edition').value;
  $('pack-nom').textContent = $('edition').selectedOptions[0].dataset.nom;
});
$('ouvrir').addEventListener('click', async () => {
  if (chargement) return;
  chargement = true; $('ouvrir').disabled = true; $('edition').disabled = true; $('ouvrir').textContent = 'Ouverture…';
  idEnCours ??= crypto.randomUUID();
  try {
    const resultat = await api('/boosters', { method: 'POST', body: { edition: $('edition').value, id: idEnCours } });
    pieces(resultat.portefeuille); idEnCours = undefined;
    $('tirage').replaceChildren();
    for (const [index, carte] of resultat.cartes.entries()) {
      const bouton = document.createElement('button'); bouton.type = 'button'; bouton.className = 'carte-tirage';
      bouton.dataset.nom = `${carte.nom} · ${carte.code} · ${carte.rarete}`;
      bouton.setAttribute('aria-label', `Révéler la carte ${index + 1}`);
      if (['SR', 'SEC'].includes(carte.rarete)) bouton.classList.add('rare');
      const dos = document.createElement('span'); dos.className = 'dos'; dos.setAttribute('aria-hidden', 'true');
      const logo = document.createElement('img'); logo.src = 'favicon.svg'; logo.alt = ''; dos.append(logo, 'LOG POSE');
      const face = document.createElement('img'); face.className = 'face'; face.src = carte.image; face.alt = carte.nom; face.setAttribute('aria-hidden', 'true');
      face.addEventListener('error', () => { const texte = document.createElement('span'); texte.className = 'face'; texte.textContent = bouton.dataset.nom; face.replaceWith(texte); }, { once: true });
      bouton.append(dos, face); bouton.addEventListener('click', () => reveler(bouton)); $('tirage').append(bouton);
    }
    $('ouverture').hidden = false; $('tout-reveler').hidden = false;
    $('titre-ouverture').textContent = 'À vous de les découvrir.';
    $('ouvrir').textContent = 'Révélez vos cartes';
    $('ouverture').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (exception) {
    message(exception.message, true); $('ouvrir').disabled = false; $('ouvrir').textContent = 'Ouvrir un booster · 100 pièces';
    api('/jeu').then(pieces).catch(() => {});
  } finally { chargement = false; $('edition').disabled = false; }
});
try {
  const editions = await api('/editions');
  $('edition').replaceChildren(...editions.map(edition => { const option = new Option(`${edition.code} — ${edition.nom}`, edition.code); option.dataset.nom = edition.nom; return option; }));
  $('edition').dispatchEvent(new Event('change'));
  $('ouvrir').disabled = false;
} catch (exception) { message(exception.message, true); }
