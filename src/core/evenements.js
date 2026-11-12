// Petit bus d'événements : les systèmes se parlent sans se connaître.
const abonnes = new Map();

export function ecouter(nom, fonction) {
  if (!abonnes.has(nom)) abonnes.set(nom, new Set());
  abonnes.get(nom).add(fonction);
  return () => abonnes.get(nom).delete(fonction);
}

export function emettre(nom, donnees) {
  const liste = abonnes.get(nom);
  if (liste) for (const fonction of liste) fonction(donnees);
}
