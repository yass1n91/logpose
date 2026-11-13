import { connexions } from './stores/postgres.js';
import { ouvertures } from './stores/mongo.js';
import { tirerBooster } from './tirage.js';
import { chargerEdition } from './catalogue.js';
import { verrouiller, publicCompte, PRIX_BOOSTER } from './economie.js';
import { erreur } from './auth.js';

export async function ouvrir(utilisateurId, edition, id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw erreur(422, 'Identifiant de tirage invalide.');
  const source = await chargerEdition(edition);
  const connexion = await connexions.connect();
  try {
    await connexion.query('BEGIN');
    const compte = await verrouiller(connexion, utilisateurId);
    const existante = await connexion.query('SELECT id FROM ouvertures WHERE id=$1 AND utilisateur_id=$2', [id, utilisateurId]);
    if (existante.rows.length) {
      const document = await ouvertures.findOne({ _id: id, utilisateur_id: utilisateurId });
      if (!document) throw erreur(503, 'Le tirage est temporairement indisponible.');
      await connexion.query('COMMIT');
      return { id, cartes: document.cartes, edition: document.edition, portefeuille: publicCompte(compte) };
    }
    if (compte.pieces < PRIX_BOOSTER) throw erreur(409, 'Il faut 100 pièces pour ouvrir ce booster. Rendez-vous au collecteur de pièces.');
    const cartes = tirerBooster(source);
    compte.pieces -= PRIX_BOOSTER;
    await connexion.query('UPDATE utilisateurs SET pieces=$1 WHERE id=$2', [compte.pieces, utilisateurId]);
    await connexion.query('INSERT INTO ouvertures (id,utilisateur_id,edition) VALUES ($1,$2,$3)', [id, utilisateurId, edition]);
    for (const carte of cartes) await connexion.query('INSERT INTO virtuelles (ouverture_id,code_carte) VALUES ($1,$2)', [id, carte.code]);
    await ouvertures.replaceOne({ _id: id, utilisateur_id: utilisateurId }, { utilisateur_id: utilisateurId, edition, cartes, date: new Date() }, { upsert: true });
    await connexion.query('COMMIT');
    return { id, cartes, edition, portefeuille: publicCompte(compte) };
  } catch (exception) {
    await connexion.query('ROLLBACK').catch(() => {});
    if (exception.code === '23505') throw erreur(409, 'Ce tirage existe déjà. Actualisez la page.');
    throw exception;
  } finally { connexion.release(); }
}

export async function lister(utilisateurId) {
  const { rows: lignes } = await connexions.query(
    `SELECT v.*,o.cree_le,o.edition FROM virtuelles v JOIN ouvertures o ON v.ouverture_id=o.id
     WHERE o.utilisateur_id=$1 ORDER BY v.id DESC`, [utilisateurId]);
  const documents = await ouvertures.find({ utilisateur_id: utilisateurId, _id: { $in: [...new Set(lignes.map(ligne => ligne.ouverture_id))] } }).toArray();
  const parId = new Map(documents.map(document => [document._id, document]));
  return lignes.map(ligne => ({ ...ligne, carte: parId.get(ligne.ouverture_id)?.cartes.find(carte => carte.code === ligne.code_carte) }));
}
