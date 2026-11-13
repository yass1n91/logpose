import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from '../config.js';

pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
export const connexions = new pg.Pool({ connectionString: config.postgresUrl, connectionTimeoutMillis: 3000 });
connexions.on('error', exception => console.error(exception.message));

export async function initialiser() {
  await connexions.query(await readFile(new URL('../../sql/schema.sql', import.meta.url), 'utf8'));
}

export async function insererExemplaire(exemplaire, utilisateurId) {
  const { rows: lignes } = await connexions.query(
    `INSERT INTO exemplaires (code_carte, version, etat, langue, quantite, prix_unitaire, image_url, utilisateur_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [exemplaire.codeCarte, exemplaire.version, exemplaire.etat, exemplaire.langue, exemplaire.quantite, exemplaire.prixUnitaire, exemplaire.imageUrl, utilisateurId]);
  return lignes[0];
}

export async function supprimerExemplaire(id, utilisateurId) {
  const { rows: lignes } = await connexions.query('DELETE FROM exemplaires WHERE id=$1 AND utilisateur_id=$2 RETURNING *', [id, utilisateurId]);
  return lignes[0];
}

export async function listerExemplaires(utilisateurId) {
  const { rows: lignes } = await connexions.query(
    `SELECT exemplaire.*, t.libelle AS etat_libelle FROM exemplaires exemplaire
     JOIN etats t ON exemplaire.etat=t.code WHERE exemplaire.utilisateur_id=$1 ORDER BY exemplaire.ajoute_le DESC, exemplaire.id DESC`, [utilisateurId]);
  return lignes;
}
