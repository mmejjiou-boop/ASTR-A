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
  const pnjs = ids(brut.pnj || []);
  const donjons = ids(brut.donjons || []);
  const dialogues = ids(brut.dialogues || []);
  const SERVICES = ['auberge', 'marchand', 'armurier', 'forgeron', 'alchimiste', 'banque', 'maitreCompetences', 'tableauQuetes', 'portail'];

  // PNJ et dialogues.
  for (const p of brut.pnj || []) {
    texte(`${p.texte}.nom`, `PNJ ${p.id}`);
    if (!dialogues.has(p.dialogue)) erreurs.push(`PNJ ${p.id} : dialogue inconnu « ${p.dialogue} »`);
    for (const id of p.boutique || []) if (!objets.has(id)) erreurs.push(`PNJ ${p.id} : objet en boutique inconnu « ${id} »`);
  }
  for (const d of brut.dialogues || []) {
    for (const [cle, noeud] of Object.entries(d.noeuds)) {
      texte(noeud.texte, `dialogue ${d.id}`);
      for (const c of noeud.choix || []) {
        texte(c.texte, `dialogue ${d.id}`);
        if (c.suite && !d.noeuds[c.suite]) erreurs.push(`Dialogue ${d.id} : nœud « ${c.suite} » introuvable (depuis ${cle})`);
      }
    }
  }

  // Butin : objets existants.
  for (const b of brut.butin) {
    for (const e of [...(b.entrees || []), ...(b.quete || [])]) {
      for (const id of [e.objet, ...(e.liste || [])].filter(Boolean)) if (!objets.has(id)) erreurs.push(`Butin ${b.id} : objet inconnu « ${id} »`);
    }
  }

  // Mondes : village unique avec ses 9 services, tour, lieux, coffres.
  const coffresVus = new Set();
  for (const monde of mondesReels) {
    const services = new Set((brut.pnj || []).filter((p) => p.monde === monde.id && p.service).map((p) => p.service));
    for (const s of SERVICES) if (!services.has(s)) erreurs.push(`Monde ${monde.id} : le village n'a pas de service « ${s} »`);
    if ((monde.lieux || []).length < 25) avertissements.push(`Monde ${monde.id} : ${(monde.lieux || []).length}/25 lieux à découvrir`);
    if ((monde.coffres || []).length < 30) avertissements.push(`Monde ${monde.id} : ${(monde.coffres || []).length}/30 coffres`);
    for (const c of monde.coffres || []) {
      if (coffresVus.has(c.id)) erreurs.push(`Coffre en double « ${c.id} »`);
      coffresVus.add(c.id);
      if (!butins.has(c.butin)) erreurs.push(`Coffre ${c.id} : butin inconnu « ${c.butin} »`);
    }
    for (const l of monde.lieux || []) texte(`lieu.${l.id}`, `lieu ${l.id}`);
    for (const d of monde.donjons || []) if (!donjons.has(d.id)) erreurs.push(`Monde ${monde.id} : donjon inconnu « ${d.id} »`);
    if (monde.boss && !monstres.has(monde.boss)) erreurs.push(`Monde ${monde.id} : boss inconnu « ${monde.boss} »`);
    const familles = new Set(brut.monstres.filter((m) => m.monde === monde.id && !m.boss).map((m) => m.famille));
    if (familles.size < 5) avertissements.push(`Monde ${monde.id} : ${familles.size}/5 familles de monstres`);
  }

  // Donjons.
  for (const d of brut.donjons || []) {
    texte(d.texte, `donjon ${d.id}`);
    if (!butins.has(d.coffreFinal)) erreurs.push(`Donjon ${d.id} : butin final inconnu « ${d.coffreFinal} »`);
    for (const s of d.salles) {
      for (const vague of s.vagues || []) for (const [id] of vague) if (!monstres.has(id)) erreurs.push(`Donjon ${d.id} : monstre inconnu « ${id} »`);
      for (const id of [s.boss, s.monstre].filter(Boolean)) if (!monstres.has(id)) erreurs.push(`Donjon ${d.id} : monstre inconnu « ${id} »`);
    }
  }

  // Quêtes : références, objectifs mesurables, répartition par monde.
  const quetesIds = ids(brut.quetes || []);
  const lieuxIds = new Set(brut.mondes.flatMap((m) => (m.lieux || []).map((l) => l.id)));
  const toursIds = new Set(mondesReels.filter((m) => m.tour).map((m) => m.tour.id));
  const TYPES = ['tuer', 'collecter', 'livrer', 'parler', 'explorer', 'activer_tour', 'terminer_donjon', 'vaincre_boss', 'ouvrir_coffre', 'escorter'];
  for (const q of brut.quetes || []) {
    for (const s of ['titre', 'resume', 'fin']) texte(`${q.texte}.${s}`, `quête ${q.id}`);
    if (!pnjs.has(q.donneur)) erreurs.push(`Quête ${q.id} : donneur inconnu « ${q.donneur} »`);
    if (!pnjs.has(q.rendu)) erreurs.push(`Quête ${q.id} : PNJ de rendu inconnu « ${q.rendu} »`);
    for (const p of q.prerequis?.quetes || []) if (!quetesIds.has(p)) erreurs.push(`Quête ${q.id} : prérequis inconnu « ${p} »`);
    if (!q.objectifs?.length) erreurs.push(`Quête ${q.id} : aucun objectif`);
    for (const o of q.objectifs || []) {
      if (!TYPES.includes(o.type)) erreurs.push(`Quête ${q.id} : type d'objectif inconnu « ${o.type} »`);
      const c = o.cible;
      const ok = {
        tuer: () => monstres.has(c) || (c.startsWith('famille:') && brut.monstres.some((m) => m.famille === c.slice(8))),
        collecter: () => objets.has(c), livrer: () => objets.has(c), parler: () => pnjs.has(c), escorter: () => pnjs.has(c),
        explorer: () => lieuxIds.has(c), activer_tour: () => toursIds.has(c), terminer_donjon: () => donjons.has(c),
        vaincre_boss: () => monstres.has(c), ouvrir_coffre: () => coffresVus.has(c),
      }[o.type];
      if (ok && !ok()) erreurs.push(`Quête ${q.id} : cible introuvable « ${c} » (${o.type})`);
    }
    for (const o of q.recompenses?.objets || []) if (!objets.has(o.id)) erreurs.push(`Quête ${q.id} : récompense inconnue « ${o.id} »`);
  }
  for (const monde of mondesReels) {
    const qs = (brut.quetes || []).filter((q) => q.monde === monde.id);
    const n = (cat) => qs.filter((q) => q.categorie === cat).length;
    const impair = monde.id % 2 === 1;
    const attendu = { principale: 2, secondaire: 3, chasse: 2, donjon: impair ? 2 : 1, legendaire: impair ? 1 : 2 };
    for (const [cat, nombre] of Object.entries(attendu)) {
      if (n(cat) < nombre) erreurs.push(`Monde ${monde.id} : ${n(cat)}/${nombre} quêtes « ${cat} »`);
    }
  }
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

export const FICHIERS = ['config.json', 'textes/fr.json', 'classes.json', 'competences.json', 'monstres.json', 'objets.json', 'butin.json', 'pnj.json', 'dialogues.json', 'donjons.json'];
// Même liste que src/core/donnees.js.
export const MONDES = ['zone-test', 'monde-01'];
