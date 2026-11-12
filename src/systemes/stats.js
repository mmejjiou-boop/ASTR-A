// Formules du cahier des charges. Tous les nombres viennent de data/config.json.

export const STATS = ['force', 'intelligence', 'agilite', 'endurance', 'defense', 'chance'];

// XP pour passer du niveau n au niveau n+1 : 100 × n^1,5, arrondi.
export function xpPourNiveau(config, n) {
  return Math.round(config.xpNiveau.base * Math.pow(n, config.xpNiveau.exposant));
}

// Statistiques du héros selon sa classe, son niveau et son équipement.
export function calculerStatsHeros(donnees, classe, niveau, equipement) {
  const { config } = donnees;
  const gains = niveau - 1;
  const stats = {};
  for (const nom of STATS) {
    const parNiveau = nom === classe.statPrincipale ? config.parNiveau.statPrincipale : config.parNiveau.autresStats;
    stats[nom] = classe.statsBase[nom] + parNiveau * gains;
  }
  const facteur = 1 + config.parNiveau.vieMana * gains;
  stats.vieMax = Math.round(classe.statsBase.vie * facteur);
  stats.manaMax = Math.round(classe.statsBase.mana * facteur);

  // Équipement : attaque de l'arme, armure, et bonus de statistiques, de vie et de mana.
  stats.attaqueArme = 0;
  stats.armure = 0;
  for (const idObjet of Object.values(equipement)) {
    if (!idObjet) continue;
    const objet = donnees.objets.get(idObjet);
    if (!objet?.stats) continue;
    for (const [nom, valeur] of Object.entries(objet.stats)) {
      if (nom === 'attaque') stats.attaqueArme += valeur;
      else if (nom === 'defense') stats.armure += valeur;
      else if (nom === 'vie') stats.vieMax += valeur;
      else if (nom === 'mana') stats.manaMax += valeur;
      else if (nom in stats) stats[nom] += valeur;
    }
  }
  stats.defenseTotale = stats.defense + stats.armure;
  const d = config.degats;
  stats.critique = Math.min(d.critiqueMax, d.critiqueBase + stats.chance * d.critiqueParChance);
  return stats;
}

// Attaque = arme + 2 × la statistique utilisée par la compétence.
export function attaqueHeros(config, stats, statUtilisee) {
  return stats.attaqueArme + config.degats.facteurStatAttaque * (stats[statUtilisee] || 0);
}

// Statistiques d'un monstre de niveau N.
export function calculerStatsMonstre(config, monstre, niveau) {
  const f = config.monstre;
  const m = monstre.multiplicateurs || {};
  // Boss : vie × 12, XP × 20. Élite (monstre nommé) : vie × 3, XP × 3.
  const boss = monstre.boss ? config.boss : monstre.elite ? config.elite : { vie: 1, xp: 1 };
  return {
    vieMax: Math.round((f.vie[0] + f.vie[1] * niveau) * (m.vie || 1) * boss.vie),
    attaque: (f.attaque[0] + f.attaque[1] * niveau) * (m.attaque || 1),
    defense: f.defense[0] + f.defense[1] * niveau,
    xp: Math.round((f.xp[0] + f.xp[1] * niveau) * boss.xp),
  };
}

// Dégâts = max(1, attaque × coefficient − défense ÷ 2), ±10 %, critique × 1,5.
export function calculerDegats(config, attaque, coefficient, defense, chanceCritique = 0, aleatoire = Math.random) {
  const d = config.degats;
  let degats = Math.max(1, attaque * coefficient - defense / d.diviseurDefense);
  degats *= 1 + (aleatoire() * 2 - 1) * d.variation;
  const critique = aleatoire() < chanceCritique;
  if (critique) degats *= d.multiplicateurCritique;
  return { degats: Math.max(1, Math.round(degats)), critique };
}
