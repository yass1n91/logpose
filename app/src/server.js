import express from 'express';
import { CatalogueInjoignable, consulter, suggerer, editions } from './catalogue.js';
import * as collection from './collection.js';
import * as boosters from './boosters.js';
import * as auth from './auth.js';
import * as jeu from './economie.js';
import { config } from './config.js';
import { FORMAT_CODE, referentiel } from './referentiel.js';
import * as mongo from './stores/mongo.js';
import * as postgres from './stores/postgres.js';
import { validerSaisie } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use('/api', (requete, reponse, suite) => {
  reponse.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(requete.method)) {
    const origine = process.env.PUBLIC_ORIGIN || `${requete.protocol}://${requete.get('host')}`;
    if (requete.headers.origin && requete.headers.origin !== origine) return reponse.status(403).json({ message: 'Origine de la requête refusée.' });
    if (!requete.is('application/json')) return reponse.status(415).json({ message: 'Un corps JSON est attendu.' });
    if (process.env.COOKIE_SECURE === 'true' && !requete.secure) return reponse.status(400).json({ message: 'Utilisez la connexion HTTPS.' });
  }
  suite();
});
app.get('/api/sante', async (requete, reponse) => {
  const resultats = await Promise.allSettled([postgres.connexions.query('SELECT 1'), mongo.ping()]);
  const etat = { postgres: resultats[0].status === 'fulfilled', mongo: resultats[1].status === 'fulfilled' };
  reponse.status(etat.postgres && etat.mongo ? 200 : 503).json(etat);
});
app.use('/api', auth.identifier);
app.get('/api/auth/moi', (requete, reponse) => reponse.json(requete.utilisateur ?? null));
app.post('/api/auth/inscription', auth.limiterConnexion, auth.inscrire);
app.post('/api/auth/connexion', auth.limiterConnexion, auth.connecter);
app.post('/api/auth/deconnexion', auth.deconnecter);
app.use('/api', auth.exigerCompte);
app.post('/api/auth/mot-de-passe', auth.changerMotDePasse);
app.get('/api/referentiel', (requete, reponse) => reponse.json({ etats: referentiel.etats, langues: referentiel.langues }));
app.get('/api/catalogue', async (requete, reponse) => reponse.json(await suggerer(String(requete.query.q ?? ''))));
app.get('/api/catalogue/:code', async (requete, reponse) => {
  const code = requete.params.code.toUpperCase();
  if (!FORMAT_CODE.test(code)) return reponse.status(400).json({ message: 'Code de carte invalide.' });
  const fiche = await consulter(code);
  if (!fiche) return reponse.status(404).json({ message: 'Carte introuvable. Vous pouvez saisir son nom à la main.' });
  reponse.json(fiche);
});
app.get('/api/editions', (requete, reponse) => reponse.json(editions.map(e => ({ ...e, prix: jeu.PRIX_BOOSTER }))));
app.get('/api/collection', async (requete, reponse) => reponse.json(await collection.lister(requete.utilisateur.id)));
app.post('/api/collection', async (requete, reponse) => {
  const saisie = validerSaisie(requete.body);
  if (saisie.erreurs) return reponse.status(422).json({ message: 'Vérifiez les champs indiqués.', erreurs: saisie.erreurs });
  reponse.status(201).json(await collection.ajouter(saisie, requete.utilisateur.id));
});
app.delete('/api/collection/:id', async (requete, reponse) => {
  const id = Number(requete.params.id);
  if (!Number.isInteger(id) || id < 1) return reponse.status(400).json({ message: 'Identifiant invalide.' });
  const ligne = await postgres.supprimerExemplaire(id, requete.utilisateur.id);
  if (!ligne) return reponse.status(404).json({ message: 'Exemplaire introuvable.' });
  reponse.status(204).end();
});
app.post('/api/boosters', async (requete, reponse) => reponse.status(201).json(await boosters.ouvrir(requete.utilisateur.id, requete.body?.edition, requete.body?.id)));
app.get('/api/virtuelles', async (requete, reponse) => reponse.json(await boosters.lister(requete.utilisateur.id)));
app.get('/api/jeu', async (requete, reponse) => reponse.json(await jeu.consulterJeu(requete.utilisateur.id)));
app.post('/api/jeu/clics', async (requete, reponse) => reponse.json(await jeu.cliquer(requete.utilisateur.id, requete.body?.clics)));
app.post('/api/jeu/ameliorations', async (requete, reponse) => reponse.json(await jeu.ameliorer(requete.utilisateur.id, requete.body?.type)));
app.use((requete, reponse) => reponse.status(404).json({ message: 'Route inconnue.' }));
app.use((exception, requete, reponse, suite) => {
  console.error(exception.message);
  if (exception.type === 'entity.parse.failed' || exception.type === 'entity.too.large') return reponse.status(400).json({ message: 'Requête illisible.' });
  if (exception.status && exception.status >= 400 && exception.status < 500) return reponse.status(exception.status).json({ message: exception.message });
  if (exception instanceof CatalogueInjoignable) return reponse.status(502).json({ message: exception.message || 'Catalogue temporairement indisponible.' });
  reponse.status(503).json({ message: 'Le service est indisponible. Réessayez dans un instant.' });
});

async function demarrer() {
  await Promise.all([postgres.initialiser(), mongo.initialiser()]);
  const { rows: lignes } = await postgres.connexions.query('SELECT code, libelle FROM etats ORDER BY rang');
  referentiel.etats = lignes;
  const serveur = app.listen(config.port, () => console.log(`Log Pose : port ${config.port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => serveur.close(async () => {
      await Promise.all([postgres.connexions.end(), mongo.fermer()]);
      process.exit(0);
    }));
  }
}
demarrer().catch(exception => { console.error(exception); process.exit(1); });
