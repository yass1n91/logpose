import { FORMAT_CODE, RARETES } from './referentiel.js';
import op01 from '../data/op01.json' with { type: 'json' };
import listeEditions from '../data/editions.json' with { type: 'json' };
import { catalogue as cacheMongo } from './stores/mongo.js';

export const editions = listeEditions;
const memoire = new Map();
const chargements = new Map();
let tauxChange;
let dateChange = 0;

const API = 'https://optcgapi.com/api';

const CATEGORIES = { Leader: 'Leader', Character: 'Personnage', Event: 'Événement', Stage: 'Lieu' };
const COULEURS = { Red: 'Rouge', Green: 'Vert', Blue: 'Bleu', Purple: 'Violet', Black: 'Noir', Yellow: 'Jaune' };
const ATTRIBUTS = { Slash: 'Tranche', Strike: 'Frappe', Ranged: 'Distance', Special: 'Spécial', Wisdom: 'Sagesse' };

export class CatalogueInjoignable extends Error {}

function adresse(code) {
  if (code.startsWith('ST')) return `${API}/decks/card/${code}/`;
  if (code.startsWith('P-')) return `${API}/promos/card/${code}/`;
  return `${API}/sets/card/${code}/`;
}

function valeur(v) {
  return v === null || v === undefined || v === '' || v === 'NULL' ? null : v;
}

function nombre(v) {
  const nombreConverti = Number(valeur(v));
  return valeur(v) !== null && Number.isFinite(nombreConverti) ? nombreConverti : null;
}

export function decouperNom(nomComplet) {
  const mentions = [...nomComplet.matchAll(/\s\(([^)]+)\)/g)]
    .map((mention) => mention[1].trim())
    .filter((mention) => !/^\d+$/.test(mention) && !FORMAT_CODE.test(mention));
  const nom = nomComplet
    .replace(/\s+\(.*$/, '')
    .replace(/\s+-\s+[A-Z]{1,3}\d{0,2}-\d{3}$/, '')
    .trim();
  return { nom, version: mentions.join(', ') || 'Standard' };
}

export function normaliser(code, tirages) {
  const base = tirages.find((tirage) => tirage.card_image_id === code) ?? tirages[0];
  const extensionBase = code.split('-')[0];

  const versions = tirages
    .map((tirage) => {
      const { version } = decouperNom(tirage.card_name);
      const extension = String(tirage.set_id ?? '').replace('-', '');
      const reedition = extension && extension !== extensionBase && !code.startsWith('P-');
      return {
        libelle: reedition ? `${version} (${tirage.set_id})` : version,
        coteUsd: nombre(tirage.market_price),
        image: valeur(tirage.card_image),
        originale: tirage === base,
      };
    })
    .sort((a, b) => b.originale - a.originale || (a.coteUsd ?? Infinity) - (b.coteUsd ?? Infinity))
    .filter((v, i, toutes) => toutes.findIndex((autre) => autre.libelle === v.libelle) === i)
    .map(({ originale, ...v }) => v);

  const types = valeur(base.sub_types) ?? '';
  const rarete = base.rarity === 'PR' ? 'P' : base.rarity;

  return {
    code,
    nom: decouperNom(base.card_name).nom,
    categorie: CATEGORIES[base.card_type] ?? null,
    couleurs: String(valeur(base.card_color) ?? '')
      .split(/[\s/]+/)
      .map((carte) => COULEURS[carte])
      .filter(Boolean),
    rarete: RARETES.some((reponse) => reponse.code === rarete) ? rarete : null,
    cout: nombre(base.card_cost),
    puissance: nombre(base.card_power),
    contre: nombre(base.counter_amount) || null,
    vie: nombre(base.life),
    attribut: ATTRIBUTS[String(valeur(base.attribute) ?? '').split('/')[0]] ?? null,
    types: types.includes('/') ? types.split('/').map((tirage) => tirage.trim()).join('/') : types,
    effet: valeur(base.card_text) ?? '',
    datePrix: base.date_scraped ?? null,
    versions,
  };
}

export async function consulter(code) {
  let reponse;
  try {
    reponse = await fetch(adresse(code), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    const locale = [...op01, ...[...memoire.values()].flatMap(edition => edition.cartes)].find(carte => carte.code === code);
    if (locale) return convertir({ ...locale, horsLigne: true });
    throw new CatalogueInjoignable('Catalogue indisponible.');
  }
  if (reponse.status === 404) return null;
  if (!reponse.ok) throw new CatalogueInjoignable(`HTTP ${reponse.status}`);

  const tirages = await reponse.json().catch(() => null);
  if (!Array.isArray(tirages) || tirages.length === 0) return null;

  return convertir(normaliser(code, tirages));
}

async function convertir(fiche) {
  if (Date.now() - dateChange > (tauxChange ? 3600000 : 60000)) {
    dateChange = Date.now();
    try {
      const reponse = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', { signal: AbortSignal.timeout(4000) });
      const donnees = await reponse.json();
      if (reponse.ok && Number.isFinite(donnees.rates?.EUR) && donnees.rates.EUR > 0) tauxChange = donnees;
    } catch { tauxChange = undefined; }
  }
  return { ...fiche, dateChange: tauxChange?.date ?? null, versions: fiche.versions.map(v => ({ ...v,
    prixEur: tauxChange && typeof v.coteUsd === 'number' ? Math.round(v.coteUsd * tauxChange.rates.EUR * 100) / 100 : null,
  })) };
}

export async function chargerEdition(code) {
  const edition = editions.find(edition => edition.code === code);
  if (!edition) throw Object.assign(new Error('Édition inconnue.'), { status: 422 });
  if (memoire.get(code)?.expire > Date.now()) return memoire.get(code).cartes;
  if (chargements.has(code)) return chargements.get(code);
  const chargement = (async () => {
    const stock = await cacheMongo.findOne({ _id: code });
    if (stock && Date.now() - new Date(stock.date) < 86400000) {
      memoire.set(code, { cartes: stock.cartes, expire: new Date(stock.date).getTime() + 86400000 });
      return stock.cartes;
    }
    try {
      const reponse = await fetch(`${API}/sets/${edition.api}/`, { signal: AbortSignal.timeout(15000) });
      if (!reponse.ok) throw new Error();
      const tirages = await reponse.json();
      if (!Array.isArray(tirages) || !tirages.length) throw new Error();
      const codes = [...new Set(tirages.map(carte => carte.card_set_id).filter(carte => FORMAT_CODE.test(carte)))];
      const cartes = codes.map(carte => normaliser(carte, tirages.filter(tirage => tirage.card_set_id === carte)));
      if (cartes.length < 12) throw new Error();
      await cacheMongo.replaceOne({ _id: code }, { cartes, date: new Date() }, { upsert: true });
      memoire.set(code, { cartes, expire: Date.now() + 86400000 });
      return cartes;
    } catch {
      const secours = stock?.cartes ?? (code === 'OP01' ? op01 : null);
      if (!secours) throw new CatalogueInjoignable('Cette édition est temporairement indisponible. Aucune pièce ne sera débitée.');
      memoire.set(code, { cartes: secours, expire: Date.now() + 60000 });
      return secours;
    }
  })();
  chargements.set(code, chargement);
  try { return await chargement; } finally { chargements.delete(code); }
}

export async function suggerer(texte) {
  const recherche = texte.trim().toUpperCase();
  if (recherche.length < 3 || recherche.length > 80) return [];
  const codeEdition = recherche.match(/^(OP|EB|PRB)\d{2}/)?.[0];
  const cartes = codeEdition ? await chargerEdition(codeEdition) : [...op01, ...[...memoire.values()].flatMap(edition => edition.cartes)];
  const uniques = new Map(cartes.filter(carte => `${carte.code} ${carte.nom}`.toUpperCase().includes(recherche)).map(carte => [carte.code, carte]));
  return [...uniques.values()].slice(0, 8).map(carte => ({ code: carte.code, nom: carte.nom, image: carte.versions[0]?.image }));
}
