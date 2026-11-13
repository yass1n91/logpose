# Log Pose

Projet NoSQL réalisé par Yassin Benbrahim et Amir Kabbouri.

Log Pose permet de gérer ses cartes One Piece avec un compte personnel. On peut rechercher une carte par son code, remplir sa fiche depuis l’API, puis l’ajouter à sa collection. Un clicker permet de gagner des pièces pour ouvrir des boosters et conserver les cartes dans une collection virtuelle séparée. Les probabilités des boosters sont simplifiées.

Site : https://logpose.franklinmahrez.online

## Lancer le projet

Il faut Docker avec Docker Compose.

```sh
git clone https://github.com/yass1n91/logpose.git
cd logpose
docker compose up
```

Ouvrir http://localhost:3000 et créer un compte. Le projet lance quatre conteneurs : l’interface Caddy, le serveur Express, PostgreSQL et MongoDB. Les deux premiers ont leur propre Dockerfile.

## Vérifier les données

Depuis le site, ajouter une carte réelle et ouvrir un booster. Garder l’application en cours d’exécution et ouvrir deux terminaux à la racine du projet.

**Terminal 1 — PostgreSQL**

```sh
docker compose exec postgres psql -U logpose
```

```sql
SELECT id, nom, pieces FROM utilisateurs;
SELECT id, utilisateur_id, code_carte, quantite, prix_unitaire FROM exemplaires;
SELECT * FROM ouvertures;
SELECT * FROM virtuelles;
```

**Terminal 2 — MongoDB**

```sh
docker compose exec mongo mongosh logpose
```

```js
db.cartes.find()
db.getSiblingDB('logpose_virtuelles').ouvertures.find()
```

PostgreSQL garde les comptes, les exemplaires, les pièces et les ouvertures. MongoDB garde les fiches des cartes et le contenu des boosters.

Pour vérifier la persistance, arrêter avec `docker compose down`, puis relancer avec `docker compose up`. Les comptes et les cartes sont conservés dans les volumes Docker et restent visibles dans les deux terminaux après reconnexion.

## Tests et crédits

Pour lancer les tests : `cd app`, `npm ci`, puis `npm test`.

Interface adaptée de [Start Bootstrap Bare](https://startbootstrap.com/template/bare), licences dans `app/public/vendor/LICENSE`. Données et illustrations : [OPTCG API](https://optcgapi.com). Conversion des prix : [Frankfurter](https://frankfurter.dev).
