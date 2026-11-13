import * as postgres from './stores/postgres.js';
import { cartes } from './stores/mongo.js';

export async function ajouter({ fiche, exemplaire }, utilisateurId) {
  const ligne = await postgres.insererExemplaire(exemplaire, utilisateurId);
  const document = { ...fiche, _id: `${utilisateurId}:${fiche._id}`, code: fiche._id, utilisateur_id: utilisateurId };
  try {
    await cartes.replaceOne({ _id: document._id }, document, { upsert: true });
  } catch (erreur) {
    await postgres.supprimerExemplaire(ligne.id, utilisateurId);
    throw erreur;
  }
  return { ...ligne, carte: fiche };
}

export async function lister(utilisateurId) {
  const lignes = await postgres.listerExemplaires(utilisateurId);
  const fiches = await cartes.find({ utilisateur_id: utilisateurId, code: { $in: lignes.map(exemplaire => exemplaire.code_carte) } }).toArray();
  const parCode = new Map(fiches.map(fiche => [fiche.code, fiche]));
  return {
    exemplaires: lignes.map(exemplaire => ({ ...exemplaire, carte: parCode.get(exemplaire.code_carte) ?? { nom: exemplaire.code_carte } })),
    resume: {
      cartes: lignes.reduce((total, exemplaire) => total + exemplaire.quantite, 0),
      distinctes: new Set(lignes.map(exemplaire => exemplaire.code_carte)).size,
      valeur: Math.round(lignes.reduce((total, exemplaire) => total + exemplaire.quantite * exemplaire.prix_unitaire, 0) * 100) / 100,
    },
  };
}
