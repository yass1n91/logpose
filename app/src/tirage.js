import { randomInt } from 'node:crypto';
import catalogue from '../data/op01.json' with { type: 'json' };

export function tirerBooster(source = catalogue) {
  const cartes = [];
  const bonus = randomInt(100);
  const raretes = [...Array(6).fill('C'), ...Array(3).fill('UC'), 'R', 'R', bonus < 2 ? 'SEC' : bonus < 25 ? 'SR' : 'R'];
  for (const rarete of raretes) {
    let choix = source.filter(carte => carte.rarete === rarete && !cartes.some(tiree => tiree.code === carte.code));
    if (!choix.length) choix = source.filter(carte => ['R', 'SR', 'SEC'].includes(carte.rarete) && !cartes.some(tiree => tiree.code === carte.code));
    if (!choix.length) choix = source.filter(carte => !cartes.some(tiree => tiree.code === carte.code));
    if (!choix.length) throw new Error('Cette édition ne contient pas assez de cartes.');
    const carte = choix[randomInt(choix.length)];
    cartes.push({ code: carte.code, nom: carte.nom, rarete: carte.rarete, image: carte.versions[0].image });
  }
  return cartes;
}
