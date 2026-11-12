// Donjon : une suite de salles reliées par des couloirs, construite à partir des données.
// Salle 0 : le hall (sortie). Ensuite, les salles de data/donjons.json dans l'ordre :
//   combat   : vagues de monstres ; la grille de sortie s'ouvre quand tout est vaincu ;
//   enigme   : leviers à actionner dans l'ordre indiqué par les bannières ;
//   gardien  : un monstre d'élite ;
//   boss     : le boss du monde (une seule victoire possible).
// Un donjon terminé reste ouvert, vide, et son coffre final ne se rouvre pas.
import * as THREE from 'three';
import { materiauToon } from '../moteur3d/materiaux.js';
import { creerHasard } from '../core/hasard.js';
import { emettre } from '../core/evenements.js';
import { t } from '../core/textes.js';
import { ouvrirCoffre } from './monde.js';

export const SALLE = 26;
const COULOIR = 10;
const PORTE = 5;
const HAUTEUR_MUR = 7;
const COULEURS_LEVIERS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];

// Taille du monde plat qui contient le donjon.
export function tailleDonjon(def) {
  return Math.max(200, (def.salles.length + 1) * (SALLE + COULOIR) * 2 + 60);
}

export function centreSalle(k) {
  return k * (SALLE + COULOIR);
}

function hacher(texte) {
  let h = 2166136261;
  for (const c of texte) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function construireDonjon(def, contexte, monde) {
  const { donnees, progression, actions } = contexte;
  const { collisions, groupe, heros } = monde;
  const termine = progression.donjonsTermines.has(def.id);
  const hasard = creerHasard(hacher(def.id));
  const matSol = materiauToon({ color: def.palette.sol, contour: 0 });
  const matMur = materiauToon({ color: def.palette.mur, contour: 0.5 });
  const matAccent = materiauToon({ color: def.palette.accent, emissive: def.palette.accent, emissiveIntensity: 0.3 });

  function boite(l, h, p, materiau) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  function mur(x, z, longueur, epaisseur, angle = 0) {
    const m = boite(angle ? epaisseur : longueur, HAUTEUR_MUR, angle ? longueur : epaisseur, matMur);
    m.position.set(x, HAUTEUR_MUR / 2, z);
    groupe.add(m);
    collisions.ajouterObstacle({ type: 'boite', x, z, demiL: (angle ? epaisseur : longueur) / 2, demiP: (angle ? longueur : epaisseur) / 2, angle: 0, h: HAUTEUR_MUR, base: 0 });
  }
  function torche(x, z) {
    const flamme = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 6), materiauToon({ color: '#ffb347', emissive: '#ff6a00', emissiveIntensity: 2 }));
    flamme.position.set(x, 3.6, z);
    const support = boite(0.2, 0.6, 0.2, matMur);
    support.position.set(x, 3.1, z);
    groupe.add(flamme, support);
    monde.animations.push((tps) => { flamme.scale.y = 1 + Math.sin(tps * 11 + x) * 0.15; });
  }

  const nb = def.salles.length + 1;
  const salles = [];

  for (let k = 0; k < nb; k++) {
    const zc = centreSalle(k);
    const demi = SALLE / 2;
    const sol = boite(SALLE, 0.2, SALLE, matSol);
    sol.position.set(0, -0.1, zc);
    sol.castShadow = false;
    groupe.add(sol);
    // Murs latéraux.
    mur(-demi, zc, SALLE, 1, 1);
    mur(demi, zc, SALLE, 1, 1);
    // Murs avant/arrière avec une porte (sauf l'arrière du hall et le fond de la dernière salle).
    const longueurMorceau = (SALLE - PORTE) / 2;
    for (const [z, porte] of [[zc - demi, k > 0], [zc + demi, k < nb - 1]]) {
      if (porte) {
        mur(-(PORTE / 2 + longueurMorceau / 2), z, longueurMorceau, 1);
        mur(PORTE / 2 + longueurMorceau / 2, z, longueurMorceau, 1);
        const linteau = boite(PORTE, 1.5, 1, matAccent);
        linteau.position.set(0, HAUTEUR_MUR - 0.75, z);
        groupe.add(linteau);
      } else {
        mur(0, z, SALLE, 1);
      }
    }
    for (const x of [-demi + 0.7, demi - 0.7]) {
      torche(x, zc - 6);
      torche(x, zc + 6);
    }
    // Couloir vers la salle suivante.
    if (k < nb - 1) {
      const zCouloir = zc + demi + COULOIR / 2;
      const dalle = boite(PORTE + 2, 0.2, COULOIR, matSol);
      dalle.position.set(0, -0.1, zCouloir);
      dalle.castShadow = false;
      groupe.add(dalle);
      mur(-(PORTE / 2 + 0.5), zCouloir, COULOIR, 1, 1);
      mur(PORTE / 2 + 0.5, zCouloir, COULOIR, 1, 1);
    }
    salles.push({ k, zc, def: k === 0 ? { type: 'hall' } : def.salles[k - 1], etat: 'attente', monstres: [], vague: 0 });
  }

  // Grilles de sortie de chaque salle (sauf le hall et la dernière).
  for (const s of salles) {
    if (s.k === 0 || s.k === nb - 1) continue;
    const z = s.zc + SALLE / 2;
    const grille = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const barreau = boite(0.15, HAUTEUR_MUR - 1.5, 0.15, materiauToon({ color: '#5a5f66' }));
      barreau.position.set(-PORTE / 2 + 0.45 + i * 0.82, (HAUTEUR_MUR - 1.5) / 2, 0);
      grille.add(barreau);
    }
    const traverse = boite(PORTE, 0.2, 0.2, materiauToon({ color: '#5a5f66' }));
    traverse.position.y = 2.5;
    grille.add(traverse);
    grille.position.set(0, 0, z);
    groupe.add(grille);
    s.grille = { groupe: grille, obstacle: collisions.ajouterObstacle({ type: 'boite', x: 0, z, demiL: PORTE / 2, demiP: 0.4, angle: 0, h: HAUTEUR_MUR, base: 0 }), ouverte: false };
  }

  function ouvrirGrille(s, instantane = false) {
    if (!s.grille || s.grille.ouverte) return;
    s.grille.ouverte = true;
    collisions.retirerObstacle(s.grille.obstacle);
    if (instantane) s.grille.groupe.position.y = HAUTEUR_MUR - 1.6;
    else {
      const depart = monde.temps;
      monde.animations.push((tps) => { s.grille.groupe.position.y = Math.min(HAUTEUR_MUR - 1.6, (tps - depart) * 3); });
      emettre('message', { cle: 'msg.porteOuverte' });
    }
  }

  // Sortie (hall) : portail lumineux.
  function portailSortie(z) {
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 8, 24), materiauToon({ color: '#a9b3c1' }));
    anneau.position.set(0, 2.4, z);
    const voile = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    voile.position.set(0, 2.4, z);
    groupe.add(anneau, voile);
    monde.interactifs.push({
      id: `${def.id}-sortie-${z}`,
      position: new THREE.Vector3(0, 0, z),
      distance: 3,
      texte: () => t('interaction.sortie'),
      action: () => actions.sortirDonjon(),
    });
  }
  portailSortie(centreSalle(0) - SALLE / 2 + 2.5);

  // Monstres et mécanismes des salles.
  for (const s of salles) {
    const type = s.def.type;
    if (type === 'enigme') preparerEnigme(s);
    if (type === 'gardien' || type === 'boss') {
      const idMonstre = type === 'boss' ? s.def.boss : s.def.monstre;
      const defMonstre = donnees.monstres.get(idMonstre);
      const dejaVaincu = termine || (type === 'boss' && progression.bossVaincus.has(idMonstre));
      if (!dejaVaincu && defMonstre) {
        const m = monde.ajouterMonstre(defMonstre, defMonstre.niveaux[0], new THREE.Vector3(0, 0, s.zc + 4), `salle-${s.k}`);
        m.endormi = true;
        m.sansReapparition = true;
        m.orientation = Math.PI;
        s.monstres.push(m);
      }
    }
    if (termine) {
      s.etat = 'fini';
      ouvrirGrille(s, true);
    }
  }

  // Coffre final et sortie de la dernière salle.
  const derniere = salles[nb - 1];
  const idCoffre = `${def.id}-final`;
  let coffreFinal = null;
  function placerRecompenses() {
    if (coffreFinal) return;
    coffreFinal = creerCoffreFinal();
    coffreFinal.groupe.position.set(0, 0, derniere.zc + 7);
    groupe.add(coffreFinal.groupe);
    if (progression.coffresOuverts.has(idCoffre)) coffreFinal.ouvrir();
    collisions.ajouterObstacle({ type: 'cercle', x: 0, z: derniere.zc + 7, r: 0.9, h: 1, base: 0 });
    monde.interactifs.push({
      id: idCoffre,
      position: new THREE.Vector3(0, 0, derniere.zc + 7),
      distance: 2.8,
      texte: () => t('interaction.coffre'),
      visible: () => !progression.coffresOuverts.has(idCoffre),
      action: () => {
        coffreFinal.ouvrir();
        ouvrirCoffre(contexte, idCoffre, def.coffreFinal, def.niveau);
      },
    });
    portailSortie(derniere.zc + SALLE / 2 - 2.5);
  }
  if (termine) placerRecompenses();

  function preparerEnigme(s) {
    const n = s.def.parametres?.nombre || 3;
    const couleurs = COULEURS_LEVIERS.slice(0, n);
    // Ordre secret (fixé par le nom du donjon) montré par les bannières au-dessus de la sortie.
    const ordre = [...couleurs.keys()].sort(() => hasard.suivant() - 0.5);
    s.ordre = ordre;
    s.progres = 0;
    ordre.forEach((indexCouleur, rang) => {
      const banniere = boite(1, 1.8, 0.1, materiauToon({ color: couleurs[indexCouleur], emissive: couleurs[indexCouleur], emissiveIntensity: 0.4 }));
      banniere.position.set(-(n - 1) * 0.7 + rang * 1.4, HAUTEUR_MUR - 2.2, s.zc + SALLE / 2 - 0.6);
      groupe.add(banniere);
    });
    s.leviers = couleurs.map((couleur, i) => {
      const x = -(n - 1) * 3 + i * 6;
      const z = s.zc - 2;
      const socle = boite(1.2, 1, 1.2, matMur);
      socle.position.set(x, 0.5, z);
      const manche = new THREE.Group();
      manche.position.set(x, 1, z);
      const tige = boite(0.15, 1.3, 0.15, materiauToon({ color: '#8a8f96' }));
      tige.position.y = 0.65;
      const pommeau = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), materiauToon({ color: couleur, emissive: couleur, emissiveIntensity: 0.5 }));
      pommeau.position.y = 1.35;
      manche.add(tige, pommeau);
      manche.rotation.x = -0.6;
      groupe.add(socle, manche);
      collisions.ajouterObstacle({ type: 'cercle', x, z, r: 0.8, h: 1.2, base: 0 });
      const levier = { index: i, manche, baisse: false };
      monde.interactifs.push({
        id: `${def.id}-levier-${s.k}-${i}`,
        position: new THREE.Vector3(x, 0, z),
        distance: 2.4,
        texte: () => t('interaction.levier'),
        visible: () => s.etat === 'actif' && !levier.baisse,
        action: () => actionnerLevier(s, levier),
      });
      return levier;
    });
  }

  function actionnerLevier(s, levier) {
    levier.baisse = true;
    levier.manche.rotation.x = 0.6;
    if (s.ordre[s.progres] === levier.index) {
      s.progres++;
      if (s.progres === s.ordre.length) terminerSalle(s);
    } else {
      emettre('message', { cle: 'msg.leviersFaux' });
      s.progres = 0;
      monde.planifier(0.6, () => {
        for (const l of s.leviers) { l.baisse = false; l.manche.rotation.x = -0.6; }
      });
    }
  }

  function lancerVague(s) {
    const vague = s.def.vagues[s.vague];
    for (const [idMonstre, nombre] of vague) {
      const defMonstre = donnees.monstres.get(idMonstre);
      for (let i = 0; i < nombre; i++) {
        const p = new THREE.Vector3(hasard.entre(-8, 8), 0, s.zc + hasard.entre(0, 9));
        const m = monde.ajouterMonstre(defMonstre, Math.min(defMonstre.niveaux[1], Math.max(defMonstre.niveaux[0], def.niveau - 1)), p, `salle-${s.k}`);
        m.sansReapparition = true;
        m.etat = 'poursuite';
        m.def = { ...defMonstre, comportement: { ...defMonstre.comportement, abandon: 999 } };
        monde.visuels.anneau(p, 2, 0xff6a3a, 0.5);
        s.monstres.push(m);
      }
    }
  }

  function demarrerSalle(s) {
    s.etat = 'actif';
    const type = s.def.type;
    if (type === 'combat') lancerVague(s);
    if (type === 'enigme') emettre('message', { cle: 'msg.leviersIndice' });
    if (type === 'gardien' || type === 'boss') {
      for (const m of s.monstres) {
        m.endormi = false;
        m.def = { ...m.def, comportement: { ...m.def.comportement, abandon: 999 } };
        monde.alerter(m);
      }
      if (type === 'boss') emettre('message', { cle: `boss.${s.def.boss}.intro`, grand: true });
      if (!s.monstres.length) terminerSalle(s);
    }
    if (type === 'hall') s.etat = 'fini';
  }

  function terminerSalle(s) {
    if (s.etat === 'fini') return;
    s.etat = 'fini';
    ouvrirGrille(s);
    if (s === derniere && !progression.donjonsTermines.has(def.id)) {
      progression.donjonsTermines.add(def.id);
      emettre('message', { cle: 'msg.donjonTermine', valeurs: { nom: t(def.texte) }, grand: true });
      emettre('donjonTermine', { donjon: def.id });
      placerRecompenses();
      actions.sauvegarder();
    }
  }

  return {
    depart: [0, centreSalle(0) - 4],
    salles, // lecture seule (tests et outil de test)
    // Monstre de boss en combat (pour la grande barre de vie).
    bossActif() {
      for (const s of salles) {
        if (s.def.type === 'boss' && s.etat === 'actif') return s.monstres.find((m) => !m.mort) || null;
      }
      return null;
    },
    mettreAJour() {
      if (heros.mort) return;
      for (const s of salles) {
        const dedans = Math.abs(heros.position.z - s.zc) < SALLE / 2 - 1.5 && Math.abs(heros.position.x) < SALLE / 2;
        if (s.etat === 'attente' && dedans) demarrerSalle(s);
        if (s.etat !== 'actif') continue;
        if (s.def.type === 'combat' && s.monstres.every((m) => m.mort)) {
          s.vague++;
          if (s.vague < s.def.vagues.length) lancerVague(s);
          else terminerSalle(s);
        }
        if ((s.def.type === 'gardien' || s.def.type === 'boss') && s.monstres.every((m) => m.mort)) terminerSalle(s);
      }
    },
  };
}

function creerCoffreFinal() {
  const g = new THREE.Group();
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1), materiauToon({ color: '#6b3a8a' }));
  caisse.position.y = 0.45;
  const couvercle = new THREE.Group();
  couvercle.position.set(0, 0.9, -0.5);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.35, 1.02), materiauToon({ color: '#7d4aa0' }));
  plaque.position.set(0, 0.17, 0.5);
  const or = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.1, 0.12), materiauToon({ color: '#d4af37', emissive: '#d4af37', emissiveIntensity: 0.6 }));
  or.position.set(0, 0.17, 1);
  couvercle.add(plaque, or);
  for (const m of [caisse, plaque]) m.castShadow = true;
  g.add(caisse, couvercle);
  return { groupe: g, ouvrir() { couvercle.rotation.x = -1.9; } };
}
