import { scrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { connexions } from './stores/postgres.js';

const deriver = promisify(scrypt);
const securise = process.env.COOKIE_SECURE === 'true';
const optionsSession = { httpOnly: true, secure: securise, sameSite: 'lax', path: '/', maxAge: 14 * 86400000 };
const empreinte = jeton => createHash('sha256').update(jeton).digest('hex');
export const erreur = (status, message) => Object.assign(new Error(message), { status });

export async function hacher(motDePasse) {
  const sel = randomBytes(16).toString('hex');
  const derive = await deriver(motDePasse, sel, 64);
  return `${sel}:${derive.toString('hex')}`;
}

export async function verifier(motDePasse, empreinteMotDePasse) {
  const [sel, cle] = empreinteMotDePasse.split(':');
  const derive = await deriver(motDePasse, sel, 64);
  const attendue = Buffer.from(cle, 'hex');
  return attendue.length === derive.length && timingSafeEqual(attendue, derive);
}

export function validerCompte(nom, motDePasse) {
  if (typeof nom !== 'string' || !/^[a-zA-Z0-9_]{3,24}$/.test(nom)) throw erreur(422, 'Identifiant : 3 à 24 lettres, chiffres ou underscores.');
  if (typeof motDePasse !== 'string' || motDePasse.length < 8 || motDePasse.length > 128) throw erreur(422, 'Mot de passe : 8 à 128 caractères.');
}

async function creerSession(reponse, id) {
  const jeton = randomBytes(32).toString('hex');
  await connexions.query('DELETE FROM sessions WHERE expire_le < now()');
  await connexions.query('INSERT INTO sessions (jeton, utilisateur_id) VALUES ($1,$2)', [empreinte(jeton), id]);
  reponse.cookie('logpose_session', jeton, optionsSession);
}

export async function identifier(requete, reponse, suite) {
  const jeton = requete.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('logpose_session='))?.slice(16);
  if (jeton && /^[a-f0-9]{64}$/.test(jeton)) {
    const { rows: lignes } = await connexions.query(`SELECT u.id, u.nom, u.cree_le FROM sessions s JOIN utilisateurs u ON u.id=s.utilisateur_id WHERE s.jeton=$1 AND s.expire_le > now()`, [empreinte(jeton)]);
    requete.utilisateur = lignes[0];
    requete.jeton = empreinte(jeton);
  }
  suite();
}

export function exigerCompte(requete, reponse, suite) {
  if (!requete.utilisateur) return reponse.status(401).json({ message: 'Connectez-vous pour continuer.' });
  suite();
}

const tentatives = new Map();
export function limiterConnexion(requete, reponse, suite) {
  const maintenant = Date.now();
  for (const [ip, essai] of tentatives) if (essai.fin < maintenant) tentatives.delete(ip);
  for (const [cle, maximum] of [[requete.ip, 100], [`${requete.ip}:${String(requete.body?.nom ?? '').toLowerCase().slice(0,24)}`, 20]]) {
    const essai = tentatives.get(cle) ?? { nombre: 0, fin: maintenant + 900000 };
    essai.nombre++;
    tentatives.set(cle, essai);
    if (essai.nombre > maximum) return reponse.status(429).json({ message: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }
  suite();
}

export async function inscrire(requete, reponse) {
  const { nom, motDePasse } = requete.body ?? {};
  validerCompte(nom, motDePasse);
  const empreinteMotDePasse = await hacher(motDePasse);
  let utilisateur;
  try {
    const { rows: lignes } = await connexions.query('INSERT INTO utilisateurs (nom,mot_de_passe) VALUES ($1,$2) RETURNING id,nom,cree_le', [nom, empreinteMotDePasse]);
    utilisateur = lignes[0];
  } catch (exception) {
    if (exception.code === '23505') throw erreur(409, 'Cet identifiant est déjà utilisé.');
    throw exception;
  }
  await creerSession(reponse, utilisateur.id);
  reponse.status(201).json(utilisateur);
}

export async function connecter(requete, reponse) {
  const { nom, motDePasse } = requete.body ?? {};
  validerCompte(nom, motDePasse);
  const { rows: lignes } = await connexions.query('SELECT id,nom,mot_de_passe FROM utilisateurs WHERE lower(nom)=lower($1)', [nom]);
  const utilisateur = lignes[0];
  const valide = await verifier(motDePasse, utilisateur?.mot_de_passe ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`);
  if (!utilisateur || !valide) throw erreur(401, 'Identifiant ou mot de passe incorrect.');
  await creerSession(reponse, utilisateur.id);
  reponse.json({ id: utilisateur.id, nom: utilisateur.nom });
}

export async function deconnecter(requete, reponse) {
  if (requete.jeton) await connexions.query('DELETE FROM sessions WHERE jeton=$1', [requete.jeton]);
  const { maxAge, ...effacement } = optionsSession;
  reponse.clearCookie('logpose_session', effacement);
  reponse.status(204).end();
}

export async function changerMotDePasse(requete, reponse) {
  const { ancien, nouveau } = requete.body ?? {};
  validerCompte(requete.utilisateur.nom, nouveau);
  if (typeof ancien !== 'string' || ancien.length > 128) throw erreur(422, 'Indiquez le mot de passe actuel.');
  const empreinteMotDePasse = await hacher(nouveau);
  const connexion = await connexions.connect();
  try {
    await connexion.query('BEGIN');
    const { rows: lignes } = await connexion.query('SELECT mot_de_passe FROM utilisateurs WHERE id=$1 FOR UPDATE', [requete.utilisateur.id]);
    if (!await verifier(ancien, lignes[0].mot_de_passe)) throw erreur(422, 'Le mot de passe actuel est incorrect.');
    await connexion.query('UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2', [empreinteMotDePasse, requete.utilisateur.id]);
    await connexion.query('DELETE FROM sessions WHERE utilisateur_id=$1', [requete.utilisateur.id]);
    await connexion.query('COMMIT');
  } catch (exception) { await connexion.query('ROLLBACK'); throw exception; }
  finally { connexion.release(); }
  await creerSession(reponse, requete.utilisateur.id);
  reponse.json({ message: 'Mot de passe modifié. Les autres sessions ont été déconnectées.' });
}
