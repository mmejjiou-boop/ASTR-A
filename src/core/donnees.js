// Charge tous les fichiers de data/ et les indexe par identifiant.
// Aucun contenu n'est écrit dans le code : tout vient d'ici.

const FICHIERS = {
  config: 'config.json',
  textes: 'textes/fr.json',
  classes: 'classes.json',
  competences: 'competences.json',
  monstres: 'monstres.json',
  objets: 'objets.json',
  butin: 'butin.json',
  pnj: 'pnj.json',
  dialogues: 'dialogues.json',
  donjons: 'donjons.json',
};

// Ajouter un monde : ajouter son nom ici (fichiers data/mondes/<nom>.json et data/quetes/<nom>.json).
export const MONDES = ['zone-test', 'monde-01'];

async function chargerJSON(base, chemin) {
  const reponse = await fetch(base + chemin, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(`Impossible de charger ${chemin} (${reponse.status})`);
  return reponse.json();
}

function indexer(liste) {
  const index = new Map();
  for (const element of liste) index.set(element.id, element);
  return index;
}

export async function chargerDonnees(base = './data/') {
  const brut = {};
  await Promise.all(
    Object.entries(FICHIERS).map(async ([cle, chemin]) => {
      brut[cle] = await chargerJSON(base, chemin);
    })
  );
  brut.mondes = await Promise.all(MONDES.map((nom) => chargerJSON(base, `mondes/${nom}.json`)));
  // Quêtes : un fichier par monde (la zone de test n'en a pas).
  brut.quetes = (await Promise.all(MONDES.filter((n) => n !== 'zone-test').map((nom) => chargerJSON(base, `quetes/${nom}.json`)))).flat();

  return {
    brut,
    config: brut.config,
    textes: brut.textes,
    classes: indexer(brut.classes),
    competences: indexer(brut.competences),
    monstres: indexer(brut.monstres),
    objets: indexer(brut.objets),
    butin: indexer(brut.butin),
    mondes: indexer(brut.mondes),
    pnj: indexer(brut.pnj),
    dialogues: indexer(brut.dialogues),
    donjons: indexer(brut.donjons),
    quetes: indexer(brut.quetes),
  };
}
