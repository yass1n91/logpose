import { connexions } from './stores/postgres.js';
import { erreur } from './auth.js';

export const PRIX_BOOSTER = 100;
export const coutAmelioration = (type, niveau) => (type === 'canon' ? 50 : 100) * 2 ** niveau;

export function calculerRecolte(compte, maintenant) {
  const secondes = Math.min(28800, Math.max(0, Math.floor((maintenant - new Date(compte.recolte_le)) / 1000)));
  return Math.min(1000000000, compte.pieces + secondes * compte.niveau_equipage);
}

export async function verrouiller(connexion, id) {
  const { rows: lignes } = await connexion.query('SELECT *, clock_timestamp() AS maintenant FROM utilisateurs WHERE id=$1 FOR UPDATE', [id]);
  const compte = lignes[0];
  if (!compte) throw erreur(401, 'Compte introuvable.');
  const maintenant = new Date(compte.maintenant);
  const secondes = Math.max(0, Math.floor((maintenant - new Date(compte.recolte_le)) / 1000));
  compte.pieces = calculerRecolte(compte, maintenant);
  compte.energie = Math.min(20, compte.energie + Math.max(0, (maintenant - new Date(compte.energie_le)) / 1000) * 10);
  const recolte = secondes > 28800 ? maintenant : new Date(new Date(compte.recolte_le).getTime() + secondes * 1000);
  await connexion.query('UPDATE utilisateurs SET pieces=$1,recolte_le=$2,energie=$3,energie_le=$4 WHERE id=$5', [compte.pieces, recolte, compte.energie, maintenant, id]);
  return compte;
}

export function publicCompte(compte) {
  return { pieces: compte.pieces, force: 1 + compte.niveau_canon, revenu: compte.niveau_equipage,
    energie: Math.floor(compte.energie), clics: Number(compte.clics_total),
    canon: { niveau: compte.niveau_canon, prix: coutAmelioration('canon', compte.niveau_canon) },
    equipage: { niveau: compte.niveau_equipage, prix: coutAmelioration('equipage', compte.niveau_equipage) } };
}

async function transaction(id, action) {
  const connexion = await connexions.connect();
  try {
    await connexion.query('BEGIN');
    const compte = await verrouiller(connexion, id);
    const accordes = await action(compte, connexion);
    await connexion.query('COMMIT');
    return { ...publicCompte(compte), accordes };
  } catch (exception) { await connexion.query('ROLLBACK'); throw exception; }
  finally { connexion.release(); }
}

export const consulterJeu = id => transaction(id, async () => undefined);

export async function cliquer(id, clics) {
  if (!Number.isInteger(clics) || clics < 1 || clics > 20) throw erreur(422, 'Nombre de clics invalide.');
  return transaction(id, async (compte, connexion) => {
    const accordes = Math.min(clics, Math.floor(compte.energie));
    compte.energie -= accordes;
    compte.pieces = Math.min(1000000000, compte.pieces + accordes * (1 + compte.niveau_canon));
    compte.clics_total = Number(compte.clics_total) + accordes;
    await connexion.query('UPDATE utilisateurs SET pieces=$1,energie=$2,clics_total=$3 WHERE id=$4', [compte.pieces, compte.energie, compte.clics_total, id]);
    return accordes;
  });
}

export async function ameliorer(id, type) {
  if (!['canon', 'equipage'].includes(type)) throw erreur(422, 'Amélioration inconnue.');
  return transaction(id, async (compte, connexion) => {
    const colonne = type === 'canon' ? 'niveau_canon' : 'niveau_equipage';
    const prix = coutAmelioration(type, compte[colonne]);
    if (compte[colonne] >= 15) throw erreur(409, 'Niveau maximal atteint.');
    if (compte.pieces < prix) throw erreur(409, 'Il vous manque des pièces.');
    compte.pieces -= prix;
    compte[colonne]++;
    await connexion.query(`UPDATE utilisateurs SET pieces=$1,${colonne}=$2 WHERE id=$3`, [compte.pieces, compte[colonne], id]);
  });
}
