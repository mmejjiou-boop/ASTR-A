// Tirage du butin d'un monstre ou d'un coffre à partir des tables de data/butin.json.
// Entrées possibles : { objet, poids } | { liste: [ids], poids } | { rien: true, poids }.
// Les objets de quête ({ objet, chance, queteActive }) ne tombent que si la quête en a besoin.

export function tirerButin(donnees, idTable, niveau, quetes, aleatoire = Math.random) {
  const table = donnees.butin.get(idTable);
  const resultat = { or: 0, objets: [] };
  if (!table) return resultat;
  const [orMin, orMax] = table.or || [0, 0];
  resultat.or = Math.floor(orMin + aleatoire() * (orMax - orMin + 1));

  const total = (table.entrees || []).reduce((s, e) => s + e.poids, 0);
  for (let k = 0; k < (table.tirages || 1) && total > 0; k++) {
    let tirage = aleatoire() * total;
    const entree = table.entrees.find((e) => (tirage -= e.poids) < 0);
    if (!entree || entree.rien) continue;
    if (entree.objet) resultat.objets.push({ id: entree.objet, quantite: 1 });
    if (entree.liste) {
      // Équipement adapté au niveau : pas d'objet trop puissant.
      const possibles = entree.liste.filter((id) => (donnees.objets.get(id)?.niveauRequis || 1) <= niveau + 2);
      if (possibles.length) resultat.objets.push({ id: possibles[Math.floor(aleatoire() * possibles.length)], quantite: 1 });
    }
  }
  for (const q of table.quete || []) {
    if (quetes?.objetQueteUtile(q.objet, q.queteActive) && aleatoire() < q.chance) resultat.objets.push({ id: q.objet, quantite: 1 });
  }
  return resultat;
}
