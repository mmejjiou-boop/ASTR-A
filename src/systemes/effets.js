// Effets d'état : brûlure, poison, saignement, malédiction (dégâts sur la durée),
// ralentissement et étourdissement. Les mêmes règles pour le héros et les monstres.

const DEGATS_SUR_LA_DUREE = new Set(['brulure', 'poison', 'saignement', 'malediction']);

// def : { id, chance, duree, degatsParSeconde?, force? } venant des données.
// puissance : attaque de celui qui applique l'effet (pour les dégâts sur la durée).
export function appliquerEffet(cible, def, puissance, aleatoire = Math.random) {
  if (aleatoire() > (def.chance ?? 1)) return false;
  // Un même effet n'est pas cumulé : il est renouvelé.
  const existant = cible.effets.find((e) => e.id === def.id);
  const effet = {
    id: def.id,
    restant: def.duree,
    force: def.force || 0,
    degatsParSeconde: DEGATS_SUR_LA_DUREE.has(def.id) ? Math.max(1, (def.degatsParSeconde || 0.1) * puissance) : 0,
    accumulateur: 0,
  };
  if (existant) Object.assign(existant, effet);
  else cible.effets.push(effet);
  return true;
}

// Fait avancer les effets. surDegats(montant, idEffet) est appelé à chaque tic.
export function mettreAJourEffets(cible, dt, surDegats) {
  for (const effet of cible.effets) {
    effet.restant -= dt;
    if (effet.degatsParSeconde > 0) {
      effet.accumulateur += dt;
      // Un tic de dégâts par seconde.
      while (effet.accumulateur >= 1) {
        effet.accumulateur -= 1;
        surDegats(Math.round(effet.degatsParSeconde), effet.id);
      }
    }
  }
  cible.effets = cible.effets.filter((e) => e.restant > 0);
}

export function estEtourdi(cible) {
  return cible.effets.some((e) => e.id === 'etourdissement');
}

// Multiplicateur de vitesse (1 = normal).
export function facteurVitesse(cible) {
  let facteur = 1;
  for (const e of cible.effets) {
    if (e.id === 'ralentissement') facteur = Math.min(facteur, 1 - e.force);
    if (e.id === 'gel') facteur = Math.min(facteur, 0.4);
  }
  return facteur;
}
