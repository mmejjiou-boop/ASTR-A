// Vérification du contenu : compte les éléments et contrôle les références.
// Utilisée par outils/verification.html (navigateur) et outils/verifier.mjs (Node).
// brut : { config, textes, classes, competences, monstres, objets, butin, mondes }

export const TOTAUX = [
  { cle: 'classes', libelle: 'Classes', exige: 15 },
  { cle: 'mondes', libelle: 'Mondes', exige: 10, exact: true },
  { cle: 'villages', libelle: 'Villages (1 par monde)', exige: 10, exact: true },
  { cle: 'tours', libelle: "Tours d'observation (1 par monde)", exige: 10, exact: true },
  { cle: 'quetes', libelle: 'Quêtes', exige: 100 },
  { cle: 'donjons', libelle: 'Donjons', exige: 20 },
  { cle: 'familles', libelle: 'Familles de monstres', exige: 50 },
  { cle: 'boss', libelle: 'Boss de monde', exige: 10 },
];

export function verifier(brut) {
  const erreurs = [];
  const avertissements = [];
  const ids = (liste) => new Set(liste.map((e) => e.id));
  const classes = ids(brut.classes);
  const competences = ids(brut.competences);
  const monstres = ids(brut.monstres);
  const objets = ids(brut.objets);
  const butins = ids(brut.butin);
  const textes = brut.textes;

  // Identifiants uniques.
  for (const [nom, liste] of Object.entries({ classes: brut.classes, competences: brut.competences, monstres: brut.monstres, objets: brut.objets, butin: brut.butin })) {
    const vus = new Set();
    for (const e of liste) {
      if (!e.id) erreurs.push(`${nom} : un élément n'a pas d'identifiant`);
      else if (vus.has(e.id)) erreurs.push(`${nom} : identifiant en double « ${e.id} »`);
      vus.add(e.id);
    }
  }

  const texte = (cle, ou) => {
    if (!(cle in textes)) erreurs.push(`Texte manquant « ${cle} » (${ou})`);
  };

  for (const c of brut.classes) {
    for (const suffixe of ['nom', 'role', 'forces', 'faiblesses']) texte(`${c.texte}.${suffixe}`, `classe ${c.id}`);
    if (!(c.statPrincipale in c.statsBase)) erreurs.push(`Classe ${c.id} : statistique principale inconnue « ${c.statPrincipale} »`);
    const { actives, passive, ultime } = c.competences;
    for (const id of [...actives, passive, ultime].filter(Boolean)) {
      if (!competences.has(id)) erreurs.push(`Classe ${c.id} : compétence inconnue « ${id} »`);
    }
    if (actives.length < 3) avertissements.push(`Classe ${c.id} : ${actives.length}/3 compétences actives (complété à l'étape 3)`);
    if (!passive) avertissements.push(`Classe ${c.id} : pas encore de passive (étape 3)`);
    if (!ultime) avertissements.push(`Classe ${c.id} : pas encore d'ultime (étape 3)`);
    for (const id of c.equipementDepart) if (!objets.has(id)) erreurs.push(`Classe ${c.id} : objet de départ inconnu « ${id} »`);
  }

  for (const c of brut.competences) {
    texte(`${c.texte}.nom`, `compétence ${c.id}`);
    texte(`${c.texte}.description`, `compétence ${c.id}`);
    if (!classes.has(c.classe)) erreurs.push(`Compétence ${c.id} : classe inconnue « ${c.classe} »`);
  }

  for (const m of brut.monstres) {
    texte(`${m.texte}.nom`, `monstre ${m.id}`);
    if (m.butin && !butins.has(m.butin)) erreurs.push(`Monstre ${m.id} : table de butin inconnue « ${m.butin} »`);
    for (const [nom, valeur] of Object.entries(m.multiplicateurs || {})) {
      if (valeur < 0.7 || valeur > 1.3) erreurs.push(`Monstre ${m.id} : multiplicateur de ${nom} hors limites (${valeur}, entre 0,7 et 1,3)`);
    }
  }

  for (const o of brut.objets) texte(`${o.texte}.nom`, `objet ${o.id}`);

  const mondesReels = brut.mondes.filter((m) => !m.test);
  for (const monde of brut.mondes) {
    for (const zone of monde.zones || []) {
      for (const [id] of zone.monstres) if (!monstres.has(id)) erreurs.push(`Monde ${monde.id} : monstre inconnu « ${id} »`);
    }
    if (!monde.test) {
      if (!monde.village) erreurs.push(`Monde ${monde.id} : pas de village`);
      if (!monde.tour) erreurs.push(`Monde ${monde.id} : pas de tour d'observation`);
    }
  }

  // Raretés : la somme des chances doit faire 100 %.
  const somme = brut.config.raretes.reduce((s, r) => s + r.chance, 0);
  if (Math.abs(somme - 1) > 0.0001) erreurs.push(`Raretés : la somme des chances fait ${(somme * 100).toFixed(1)} % au lieu de 100 %`);

  const familles = new Set(brut.monstres.filter((m) => !m.boss).map((m) => m.famille));
  const quetes = brut.quetes || [];
  const comptes = {
    classes: brut.classes.length,
    mondes: mondesReels.length,
    villages: mondesReels.filter((m) => m.village).length,
    tours: mondesReels.filter((m) => m.tour).length,
    quetes: quetes.length,
    donjons: (brut.donjons || []).length,
    familles: familles.size,
    boss: brut.monstres.filter((m) => m.boss).length,
  };
  const totaux = TOTAUX.map((t) => ({
    ...t,
    actuel: comptes[t.cle],
    ok: t.exact ? comptes[t.cle] === t.exige : comptes[t.cle] >= t.exige,
    depasse: t.exact && comptes[t.cle] > t.exige,
  }));
  for (const t of totaux) if (t.depasse) erreurs.push(`${t.libelle} : ${t.actuel} au lieu d'exactement ${t.exige}`);

  return { totaux, erreurs, avertissements };
}

export const FICHIERS = ['config.json', 'textes/fr.json', 'classes.json', 'competences.json', 'monstres.json', 'objets.json', 'butin.json'];
export const MONDES = ['mondes/zone-test.json'];
