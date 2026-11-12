// Sauvegarde locale dans le navigateur, export et import d'un fichier.
// Format décrit dans docs/etape-0-cadrage.md (section 3).

const VERSION = 1;
let cle = 'astrea.sauvegarde';

export function configurerSauvegarde(config) {
  cle = config.sauvegarde.cle;
}

export function stockageDisponible() {
  try {
    const test = '__astrea_test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Construit l'objet de sauvegarde à partir de l'état du jeu.
export function construireSauvegarde(heros, monde, extra) {
  return {
    version: VERSION,
    date: new Date().toISOString(),
    tempsDeJeu: Math.round(extra.tempsDeJeu),
    personnage: heros.profil(),
    position: {
      monde: monde.def.id,
      x: round2(heros.position.x),
      y: round2(heros.position.y),
      z: round2(heros.position.z),
      orientation: round2(heros.orientation),
    },
    inventaire: heros.inventaire,
    equipement: heros.equipement,
    banque: extra.banque || { or: 0, objets: [] },
    competences: { debloquees: heros.competencesDebloquees, raccourcis: extra.raccourcis || [] },
    quetes: extra.quetes || { actives: {}, terminees: [] },
    carte: extra.carte || {},
    coffresOuverts: extra.coffresOuverts || [],
    donjonsTermines: extra.donjonsTermines || [],
    bossVaincus: extra.bossVaincus || [],
    options: extra.options,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function ecrire(sauvegarde) {
  try {
    localStorage.setItem(cle, JSON.stringify(sauvegarde));
    return true;
  } catch (e) {
    console.error('Sauvegarde impossible', e);
    return false;
  }
}

export function lire(donnees) {
  try {
    const texte = localStorage.getItem(cle);
    if (!texte) return null;
    const sauvegarde = migrer(JSON.parse(texte));
    const erreur = valider(sauvegarde, donnees);
    if (erreur) {
      console.warn('Sauvegarde invalide :', erreur);
      return null;
    }
    return sauvegarde;
  } catch (e) {
    console.warn('Sauvegarde illisible', e);
    return null;
  }
}

export function existe(donnees) {
  return lire(donnees) !== null;
}

// Convertit une ancienne version du format vers la version actuelle.
function migrer(sauvegarde) {
  // Version 1 : format actuel. Les futures migrations s'ajouteront ici.
  return sauvegarde;
}

// Renvoie un message d'erreur, ou null si la sauvegarde est correcte.
export function valider(s, donnees) {
  if (!s || typeof s !== 'object') return 'ce n\'est pas un objet JSON';
  if (typeof s.version !== 'number') return 'version absente';
  if (s.version > VERSION) return `version ${s.version} plus récente que le jeu`;
  const p = s.personnage;
  if (!p || typeof p.nom !== 'string' || !p.nom.trim()) return 'personnage ou nom absent';
  if (!donnees.classes.has(p.classe)) return `classe inconnue : ${p.classe}`;
  if (!Number.isInteger(p.niveau) || p.niveau < 1 || p.niveau > donnees.config.niveauMax) return 'niveau invalide';
  if (typeof p.xp !== 'number' || p.xp < 0 || typeof p.or !== 'number' || p.or < 0) return 'XP ou or invalide';
  if (!s.position || !donnees.mondes.has(s.position.monde)) return 'position ou monde invalide';
  for (const v of ['x', 'y', 'z']) if (!Number.isFinite(s.position[v])) return 'coordonnées invalides';
  if (!Array.isArray(s.inventaire)) return 'inventaire absent';
  for (const o of s.inventaire) if (!donnees.objets.has(o.id)) return `objet inconnu : ${o.id}`;
  if (!s.equipement || typeof s.equipement !== 'object') return 'équipement absent';
  for (const uid of Object.values(s.equipement)) {
    if (uid && !s.inventaire.some((o) => o.uid === uid)) return `objet équipé introuvable : ${uid}`;
  }
  if (!s.competences || !Array.isArray(s.competences.debloquees)) return 'compétences absentes';
  return null;
}

export function exporter(sauvegarde) {
  const date = new Date().toISOString().slice(0, 10);
  const nom = sauvegarde.personnage.nom.replace(/[^\p{L}\p{N}_-]/gu, '_');
  const blob = new Blob([JSON.stringify(sauvegarde, null, 2)], { type: 'application/json' });
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  lien.download = `astrea-${nom}-${date}.json`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
}

// Ouvre le sélecteur de fichier et renvoie la sauvegarde validée.
export function importer(donnees) {
  return new Promise((resoudre, rejeter) => {
    const champ = document.createElement('input');
    champ.type = 'file';
    champ.accept = '.json,application/json';
    champ.addEventListener('change', async () => {
      const fichier = champ.files?.[0];
      if (!fichier) return rejeter(new Error('aucun fichier choisi'));
      try {
        const sauvegarde = migrer(JSON.parse(await fichier.text()));
        const erreur = valider(sauvegarde, donnees);
        if (erreur) return rejeter(new Error(erreur));
        resoudre(sauvegarde);
      } catch {
        rejeter(new Error('le fichier n\'est pas un JSON valide'));
      }
    });
    champ.click();
  });
}
