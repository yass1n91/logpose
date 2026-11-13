import { FORMAT_CODE, LANGUES, referentiel, extensionDuCode } from './referentiel.js';

export function validerSaisie(saisie) {
  const s = saisie && typeof saisie === 'object' ? saisie : {};
  const erreurs = {};
  const code = typeof s.code === 'string' ? s.code.trim().toUpperCase() : '';
  const nom = typeof s.nom === 'string' ? s.nom.trim() : '';
  const quantite = s.quantite === undefined ? 1 : Number(s.quantite);
  const prix = s.prix === undefined || s.prix === '' ? 0 : Number(s.prix);
  const etat = s.etat ?? 'NM';
  const langue = s.langue ?? 'FR';
  const version = String(s.version ?? 'Standard').trim() || 'Standard';
  if (!FORMAT_CODE.test(code)) erreurs.code = 'Exemple de code : OP01-001.';
  if (!nom || nom.length > 80) erreurs.nom = 'Indiquez un nom de 1 à 80 caractères.';
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > 99) erreurs.quantite = 'Quantité entre 1 et 99.';
  if (!Number.isFinite(prix) || prix < 0 || prix > 1000000) erreurs.prix = 'Prix entre 0 et 1 000 000 €.';
  if (!referentiel.etats.some(e => e.code === etat)) erreurs.etat = 'État inconnu.';
  if (!LANGUES.some(l => l.code === langue)) erreurs.langue = 'Langue inconnue.';
  if (version.length > 60) erreurs.version = 'Version limitée à 60 caractères.';
  if (Object.keys(erreurs).length) return { erreurs };
  const fiche = { _id: code, nom, extension: extensionDuCode(code) };
  if (typeof s.rarete === 'string' && s.rarete.length <= 10) fiche.rarete = s.rarete;
  for (const champ of ['categorie', 'attribut', 'types', 'effet']) {
    if (typeof s[champ] === 'string' && s[champ].length <= 1500) fiche[champ] = s[champ];
  }
  for (const champ of ['cout', 'puissance', 'contre', 'vie']) {
    if (Number.isInteger(s[champ]) && s[champ] >= 0 && s[champ] <= 20000) fiche[champ] = s[champ];
  }
  if (Array.isArray(s.couleurs) && s.couleurs.length <= 6 && s.couleurs.every(c => typeof c === 'string' && c.length <= 15)) fiche.couleurs = s.couleurs;
  const imageUrl = typeof s.image === 'string' && /^https:\/\/optcgapi\.com\/media\/[\w./-]{1,200}$/.test(s.image) ? s.image : null;
  return { fiche, exemplaire: { codeCarte: code, version, etat, langue, quantite, prixUnitaire: Math.round(prix * 100) / 100, imageUrl } };
}
