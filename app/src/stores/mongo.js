import { MongoClient } from 'mongodb';
import { config } from '../config.js';

const client = new MongoClient(config.mongoUrl, { serverSelectionTimeoutMS: 3000 });
export const db = client.db(config.mongoBase);
export const cartes = db.collection('cartes');
export const catalogue = db.collection('catalogue');
export const ouvertures = client.db(`${config.mongoBase}_virtuelles`).collection('ouvertures');

export async function initialiser() {
  await db.command({ ping: 1 });
  if (await db.listCollections({ name: 'cartes' }).hasNext()) {
    await db.command({ collMod: 'cartes', validator: { $jsonSchema: { bsonType: 'object', required: ['_id', 'nom'] } } });
  }
}

export const ping = () => db.command({ ping: 1 });
export const fermer = () => client.close();
