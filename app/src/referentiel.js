
export const RARETES = [
  { code: 'C', libelle: 'Commune' },
  { code: 'UC', libelle: 'Peu commune' },
  { code: 'R', libelle: 'Rare' },
  { code: 'SR', libelle: 'Super Rare' },
  { code: 'SEC', libelle: 'Secret Rare' },
  { code: 'L', libelle: 'Leader' },
  { code: 'TR', libelle: 'Treasure Rare' },
  { code: 'P', libelle: 'Promo' },
];

export const LANGUES = [
  { code: 'FR', libelle: 'Français' },
  { code: 'EN', libelle: 'Anglais' },
  { code: 'JP', libelle: 'Japonais' },
];

export const EXTENSIONS = {
  OP01: 'Romance Dawn',
  OP02: 'Paramount War',
  OP03: 'Pillars of Strength',
  OP04: 'Kingdoms of Intrigue',
  OP05: 'Awakening of the New Era',
  OP06: 'Wings of the Captain',
  OP07: '500 Years in the Future',
  OP08: 'Two Legends',
  OP09: 'Emperors in the New World',
  OP10: 'Royal Blood',
  OP11: 'A Fist of Divine Speed',
  OP12: 'Legacy of the Master',
  OP13: 'Carrying On His Will',
  OP14: "The Azure Sea's Seven",
  OP15: "Adventure on Kami's Island",
  OP16: 'The Time of Battle',
  OP17: "The World's Strongest Warriors",
  OP18: 'The Dominance of God',
  EB01: 'Memorial Collection',
  EB02: 'Anime 25th Collection',
  EB03: 'Heroines Edition',
  EB04: 'Egghead Crisis',
  EB05: 'Heroines Edition Vol. 2',
  PRB01: 'Premium Booster - The Best',
  PRB02: 'Premium Booster - The Best Vol. 2',
};

export const FORMAT_CODE = /^(?:(?:OP|EB|ST|PRB)\d{2}-\d{3}|P-\d{3})$/;

export function extensionDuCode(code) {
  const prefixe = code.split('-')[0];
  if (prefixe === 'P') return { code: 'P', nom: 'Cartes promotionnelles' };
  if (prefixe.startsWith('ST')) return { code: prefixe, nom: `Starter Deck ${prefixe.slice(2)}` };
  return { code: prefixe, nom: EXTENSIONS[prefixe] ?? prefixe };
}

export const referentiel = {
  etats: [],
  langues: LANGUES,
};
