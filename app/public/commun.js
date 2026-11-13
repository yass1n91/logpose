export const $ = id => document.getElementById(id);
export const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const publique = document.body.dataset.page === 'connexion';
let minuterie;
export function message(texte, probleme = false) {
  $('message').textContent = texte;
  $('message').classList.toggle('probleme', probleme);
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { $('message').textContent = ''; }, 7000);
}
export async function api(chemin, options = {}) {
  const ecriture = options.method && options.method !== 'GET';
  const reponse = await fetch(`/api${chemin}`, { ...options, credentials: 'same-origin',
    headers: ecriture ? { 'Content-Type': 'application/json' } : undefined,
    body: ecriture ? JSON.stringify(options.body ?? {}) : undefined });
  if (reponse.status === 204) return null;
  const resultat = await reponse.json().catch(() => ({ message: 'Le serveur est indisponible.' }));
  if (!reponse.ok) {
    if (reponse.status === 401 && !publique) location.replace('connexion.html');
    throw Object.assign(new Error(resultat.message), { status: reponse.status, erreurs: resultat.erreurs });
  }
  return resultat;
}
export function pieces(portefeuille) {
  if ($('pieces')) $('pieces').textContent = portefeuille.pieces.toLocaleString('fr-FR');
}
export const utilisateur = await api('/auth/moi');
addEventListener('pageshow', evenement => { if (evenement.persisted) location.reload(); });
if (!utilisateur && !publique) {
  location.replace(`connexion.html?suivant=${encodeURIComponent(location.pathname)}`);
  await new Promise(() => {});
}
if (utilisateur) {
  if ($('profil')) $('profil').textContent = utilisateur.nom;
  if ($('deconnexion')) $('deconnexion').addEventListener('click', async () => {
    try { await api('/auth/deconnexion', { method: 'POST' }); location.replace('connexion.html'); }
    catch (exception) { message(exception.message, true); }
  });
  if (!publique) {
    try { pieces(await api('/jeu')); } catch (exception) { message(exception.message, true); }
  }
}
