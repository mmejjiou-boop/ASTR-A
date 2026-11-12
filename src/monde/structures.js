// Constructions d'un monde ouvert, générées à partir des données :
// village (bâtiments des services, puits, portail), tour d'observation,
// lieux à découvrir (ruines, camps, ponts…), coffres et entrées de donjon.
// Chaque construction ajoute ses obstacles, ses sols et ses points d'interaction.
import * as THREE from 'three';
import { materiauToon } from '../moteur3d/materiaux.js';
import { creerHasard } from '../core/hasard.js';

const cache = new Map();
function mat(couleur, options = {}) {
  const cle = couleur + JSON.stringify(options);
  if (!cache.has(cle)) cache.set(cle, materiauToon({ color: couleur, ...options }));
  return cache.get(cle);
}
function boite(l, h, p, couleur, options) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat(couleur, options));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cylindre(r1, r2, h, couleur, cotes = 8, options) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, cotes), mat(couleur, options));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const COULEURS_SERVICE = {
  auberge: '#b03a2e', marchand: '#2e8b57', armurier: '#6c7a89', forgeron: '#d35400',
  alchimiste: '#8e44ad', banque: '#d4af37', maitreCompetences: '#2e86c1', maison: '#a0522d',
};

// Zones à aplanir avant de générer le terrain.
export function zonesPlates(monde) {
  const zones = [];
  if (monde.village) zones.push({ x: monde.village.position[0], z: monde.village.position[1], r: monde.village.rayon, marge: 40 });
  if (monde.tour) zones.push({ x: monde.tour.position[0], z: monde.tour.position[1], r: 16, marge: 20 });
  for (const d of monde.donjons || []) zones.push({ x: d.position[0], z: d.position[1], r: 12, marge: 16 });
  for (const l of monde.lieux || []) {
    if (['pont', 'lac'].includes(l.type)) continue;
    zones.push({ x: l.position[0], z: l.position[1], r: l.type === 'camp' ? 20 : 11, marge: 14 });
  }
  return zones;
}

// contexte : { collisions, terrain, groupe, interactifs, donnees, progression, actions }
export function construireStructures(monde, contexte) {
  const { collisions, terrain, groupe } = contexte;
  const sol = (x, z) => terrain.hauteur(x, z);
  const points = { village: null, tour: null, donjons: [], lieux: [], coffres: [] };

  // ---------- Village ----------
  if (monde.village) {
    const v = monde.village;
    const [vx, vz] = v.position;
    const h0 = sol(vx, vz);
    const village = new THREE.Group();
    village.position.set(vx, 0, vz);
    groupe.add(village);
    points.village = { id: v.id, texte: v.texte, x: vx, z: vz };

    // Place pavée.
    const place = new THREE.Mesh(new THREE.CircleGeometry(30, 40).rotateX(-Math.PI / 2), mat('#c9b48a', { contour: 0 }));
    place.position.y = h0 + 0.05;
    place.receiveShadow = true;
    village.add(place);
    const chemin = new THREE.Mesh(new THREE.RingGeometry(36, 44, 48).rotateX(-Math.PI / 2), mat('#bfa77a', { contour: 0 }));
    chemin.position.y = h0 + 0.04;
    chemin.receiveShadow = true;
    village.add(chemin);

    for (const b of v.batiments) {
      const [bx, bz] = b.position;
      const maison = creerMaison(b.service);
      maison.position.set(bx, sol(vx + bx, vz + bz), bz);
      maison.rotation.y = b.angle;
      village.add(maison);
      collisions.ajouterObstacle({ type: 'boite', x: vx + bx, z: vz + bz, demiL: 4.2, demiP: 3.7, angle: b.angle, h: 7 });
    }

    // Puits central.
    const [px, pz] = v.places.puits;
    const puits = creerPuits();
    puits.position.set(px, h0, pz);
    village.add(puits);
    collisions.ajouterObstacle({ type: 'cercle', x: vx + px, z: vz + pz, r: 1.5, h: 3 });

    // Portail de voyage (arche lumineuse).
    const [ox, oz] = v.places.portail;
    const arche = new THREE.Group();
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.35, 8, 24), mat('#a9b3c1'));
    anneau.position.y = 3;
    anneau.castShadow = true;
    const voile = new THREE.Mesh(new THREE.CircleGeometry(2.3, 24), new THREE.MeshBasicMaterial({ color: 0x7ff0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    voile.position.y = 3;
    const socle = cylindre(3, 3.3, 0.4, '#8d8576', 12);
    socle.position.y = 0.2;
    arche.add(anneau, voile, socle);
    arche.position.set(ox, sol(vx + ox, vz + oz), oz);
    village.add(arche);
    collisions.ajouterObstacle({ type: 'boite', x: vx + ox, z: vz + oz, demiL: 3, demiP: 0.5, angle: 0, h: 6 });
    contexte.animations.push((t) => { voile.material.opacity = 0.35 + Math.sin(t * 2) * 0.12; });

    // Lanternes autour de la place (elles brillent grâce au bloom).
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const lx = Math.cos(a) * 33, lz = Math.sin(a) * 33;
      const lanterne = new THREE.Group();
      const poteau = cylindre(0.08, 0.1, 3, '#4a3a2a', 6);
      poteau.position.y = 1.5;
      const lumiere = boite(0.35, 0.45, 0.35, '#ffd27a', { emissive: '#ffb347', emissiveIntensity: 1.2 });
      lumiere.position.y = 3.1;
      lanterne.add(poteau, lumiere);
      lanterne.position.set(lx, sol(vx + lx, vz + lz), lz);
      village.add(lanterne);
      collisions.ajouterObstacle({ type: 'cercle', x: vx + lx, z: vz + lz, r: 0.25, h: 3 });
    }

    // Palissade avec quatre ouvertures.
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      if (k % 16 > 13) continue; // ouvertures
      const r = v.rayon - 4;
      const fx = Math.cos(a) * r, fz = Math.sin(a) * r;
      const pieu = cylindre(0.18, 0.22, 2.4, '#7a5232', 5);
      pieu.position.set(fx, sol(vx + fx, vz + fz) + 1.1, fz);
      village.add(pieu);
      collisions.ajouterObstacle({ type: 'cercle', x: vx + fx, z: vz + fz, r: 0.45, h: 2.4 });
    }
  }

  // ---------- Tour d'observation ----------
  if (monde.tour) {
    const t = monde.tour;
    const [tx, tz] = t.position;
    const base = sol(tx, tz);
    const tour = creerTour(t);
    tour.groupe.position.set(tx, base, tz);
    groupe.add(tour.groupe);
    contexte.animations.push(tour.animer);
    // Le fût bloque jusqu'au sommet ; on peut marcher sur la plateforme du haut.
    collisions.ajouterObstacle({ type: 'cercle', x: tx, z: tz, r: t.rayon, h: t.hauteur - 0.3, base });
    // Plateformes : on peut s'y reposer pendant l'escalade.
    for (const hp of tour.paliers) {
      collisions.ajouterSol({ type: 'disque', x: tx, z: tz, r: t.rayon + 2.4, rInterieur: t.rayon - 0.1, h: base + hp });
    }
    collisions.ajouterSol({ type: 'disque', x: tx, z: tz, r: t.rayon + 2.4, h: base + t.hauteur });
    points.tour = { id: t.id, texte: t.texte, x: tx, z: tz, base, hauteur: t.hauteur, rayon: t.rayon, paliers: tour.paliers, definirActive: tour.definirActive };
  }

  // ---------- Lieux ----------
  const hasard = creerHasard((monde.terrain.graine || 1) + 5);
  for (const l of monde.lieux || []) {
    const [lx, lz] = l.position;
    const decor = creerLieu(l, lx, lz, contexte, hasard);
    if (decor) groupe.add(decor);
    points.lieux.push({ id: l.id, type: l.type, x: lx, z: lz });
  }

  // ---------- Entrées de donjon ----------
  for (const d of monde.donjons || []) {
    const [dx, dz] = d.position;
    const entree = creerEntreeDonjon();
    const angle = Math.atan2(-dx, -dz); // l'ouverture regarde vers le centre du monde
    entree.position.set(dx, sol(dx, dz), dz);
    entree.rotation.y = angle;
    groupe.add(entree);
    // Deux piliers rocheux de part et d'autre de l'ouverture.
    for (const sens of [1, -1]) {
      collisions.ajouterObstacle({ type: 'cercle', x: dx + Math.cos(angle) * 3.4 * sens, z: dz - Math.sin(angle) * 3.4 * sens, r: 1.6, h: 6 });
    }
    collisions.ajouterObstacle({ type: 'boite', x: dx - Math.sin(angle) * 2.5, z: dz - Math.cos(angle) * 2.5, demiL: 4.5, demiP: 1.5, angle, h: 7 });
    points.donjons.push({ id: d.id, x: dx, z: dz, angle });
  }

  // ---------- Coffres ----------
  for (const c of monde.coffres || []) {
    const [cx, cz] = c.position;
    const coffre = creerCoffre();
    coffre.groupe.position.set(cx, sol(cx, cz), cz);
    coffre.groupe.rotation.y = hasard.entre(0, Math.PI * 2);
    groupe.add(coffre.groupe);
    collisions.ajouterObstacle({ type: 'cercle', x: cx, z: cz, r: 0.6, h: 0.9 });
    points.coffres.push({ ...c, x: cx, z: cz, ouvrir: coffre.ouvrir });
  }

  return points;
}

// ---------- Modèles ----------
function creerMaison(service) {
  const g = new THREE.Group();
  const murs = boite(8, 4, 7, '#efe3c8');
  murs.position.y = 2;
  g.add(murs);
  // Colombages.
  for (const x of [-3.9, 3.9]) {
    const poutre = boite(0.25, 4, 0.25, '#6b4a2b');
    poutre.position.set(x, 2, 3.5);
    g.add(poutre);
    const poutre2 = poutre.clone();
    poutre2.position.z = -3.5;
    g.add(poutre2);
  }
  const traverse = boite(8.1, 0.25, 0.25, '#6b4a2b');
  traverse.position.set(0, 2.2, 3.52);
  g.add(traverse);
  // Toit en prisme.
  const toit = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 9, 3, 1), mat(COULEURS_SERVICE[service] || '#a0522d'));
  toit.rotation.z = Math.PI / 2;
  toit.rotation.x = Math.PI / 2;
  toit.scale.set(0.9, 1, 0.65);
  toit.position.y = 5.55;
  toit.castShadow = true;
  g.add(toit);
  const porte = boite(1.5, 2.4, 0.15, '#5a3d2b');
  porte.position.set(0, 1.2, 3.55);
  g.add(porte);
  for (const x of [-2.5, 2.5]) {
    const fenetre = boite(1, 1, 0.12, '#ffe7a8', { emissive: '#ffcf6b', emissiveIntensity: 0.35 });
    fenetre.position.set(x, 2.4, 3.55);
    g.add(fenetre);
  }
  if (service !== 'maison') {
    // Enseigne aux couleurs du service.
    const enseigne = boite(1.6, 0.8, 0.12, COULEURS_SERVICE[service], { emissive: COULEURS_SERVICE[service], emissiveIntensity: 0.25 });
    enseigne.position.set(1.6, 3.4, 4.1);
    const potence = boite(0.12, 0.12, 0.8, '#3a2a1a');
    potence.position.set(1.6, 3.85, 3.85);
    g.add(enseigne, potence);
  }
  if (service === 'forgeron') {
    const enclume = boite(0.9, 0.6, 0.5, '#3a3a40');
    enclume.position.set(-2.4, 0.5, 5);
    g.add(enclume);
    const cheminee = boite(1, 3, 1, '#8d8576');
    cheminee.position.set(-2.8, 6.2, -1.5);
    g.add(cheminee);
  }
  return g;
}

function creerPuits() {
  const g = new THREE.Group();
  const margelle = cylindre(1.3, 1.4, 1, '#9a9283', 10);
  margelle.position.y = 0.5;
  const eau = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16).rotateX(-Math.PI / 2), mat('#3f9be0', { emissive: '#3f9be0', emissiveIntensity: 0.2 }));
  eau.position.y = 0.8;
  g.add(margelle, eau);
  for (const x of [-1.1, 1.1]) {
    const montant = boite(0.18, 2.4, 0.18, '#6b4a2b');
    montant.position.set(x, 1.7, 0);
    g.add(montant);
  }
  const toit = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1, 4), mat('#b03a2e'));
  toit.position.y = 3.3;
  toit.rotation.y = Math.PI / 4;
  toit.castShadow = true;
  g.add(toit);
  return g;
}

function creerTour(def) {
  const g = new THREE.Group();
  const { hauteur, rayon } = def;
  const fut = cylindre(rayon, rayon * 1.15, hauteur, '#b8ae9c', 10);
  fut.position.y = hauteur / 2;
  g.add(fut);
  // Parois marquées : bandes claires qui montrent où grimper.
  for (let k = 0; k < 10; k += 2) {
    const a = (k / 10) * Math.PI * 2;
    const bande = boite(0.5, hauteur - 1, 0.2, '#efe6cf', { emissive: '#d9c38a', emissiveIntensity: 0.15 });
    bande.position.set(Math.sin(a) * (rayon + 0.05), hauteur / 2, Math.cos(a) * (rayon + 0.05));
    bande.rotation.y = a;
    g.add(bande);
  }
  const paliers = [];
  for (let hp = 15; hp < hauteur - 5; hp += 15) {
    const palier = cylindre(rayon + 2.4, rayon + 2.4, 0.5, '#8d8576', 14);
    palier.position.y = hp - 0.25;
    g.add(palier);
    paliers.push(hp);
  }
  const sommet = cylindre(rayon + 2.4, rayon + 1.6, 0.8, '#8d8576', 14);
  sommet.position.y = hauteur - 0.4;
  g.add(sommet);
  // Créneaux.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const creneau = boite(0.8, 0.9, 0.5, '#9a9283');
    creneau.position.set(Math.sin(a) * (rayon + 2), hauteur + 0.45, Math.cos(a) * (rayon + 2));
    creneau.rotation.y = a;
    g.add(creneau);
  }
  // Pierre d'éveil et cristal (éteint tant que la tour n'est pas activée).
  const socle = cylindre(0.7, 0.9, 1.1, '#6e665a', 8);
  socle.position.y = hauteur + 0.55;
  const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), materiauToon({ color: '#9aa8b8', emissive: '#4a6a8a', emissiveIntensity: 0.3 }));
  cristal.position.y = hauteur + 3;
  cristal.castShadow = true;
  g.add(socle, cristal);
  let active = false;
  return {
    groupe: g,
    paliers,
    animer(t) {
      cristal.rotation.y = t * (active ? 1.2 : 0.3);
      cristal.position.y = hauteur + 3 + Math.sin(t * 1.5) * 0.25;
    },
    definirActive(valeur) {
      active = valeur;
      cristal.material.color.set(valeur ? '#bff6ff' : '#9aa8b8');
      cristal.material.emissive.set(valeur ? '#3fd6ff' : '#4a6a8a');
      cristal.material.emissiveIntensity = valeur ? 1.6 : 0.3;
    },
  };
}

function creerEntreeDonjon() {
  const g = new THREE.Group();
  const roche = '#7d7466';
  for (const sens of [1, -1]) {
    const pilier = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 0), mat(roche));
    pilier.scale.set(0.9, 1.6, 0.9);
    pilier.position.set(3.4 * sens, 2.6, 0);
    pilier.castShadow = true;
    g.add(pilier);
  }
  const linteau = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), mat(roche));
  linteau.scale.set(2.2, 0.8, 1);
  linteau.position.set(0, 5.6, 0);
  linteau.castShadow = true;
  const fond = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5, 0), mat('#6a6256'));
  fond.scale.set(1.4, 1.2, 0.8);
  fond.position.set(0, 2.5, -2.5);
  const ombre = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.8), new THREE.MeshBasicMaterial({ color: 0x07060a }));
  ombre.position.set(0, 2.4, -0.4);
  const torches = [];
  for (const sens of [1, -1]) {
    const torche = boite(0.25, 0.5, 0.25, '#ffb347', { emissive: '#ff7a1a', emissiveIntensity: 1.6 });
    torche.position.set(2.2 * sens, 3.3, 1);
    torches.push(torche);
  }
  g.add(linteau, fond, ombre, ...torches);
  return g;
}

function creerCoffre() {
  const g = new THREE.Group();
  const caisse = boite(1.1, 0.6, 0.7, '#8b5a2b');
  caisse.position.y = 0.3;
  const couvercle = new THREE.Group();
  couvercle.position.set(0, 0.6, -0.35);
  const plaque = boite(1.12, 0.25, 0.72, '#9c6a35');
  plaque.position.set(0, 0.12, 0.35);
  const ferrure = boite(1.14, 0.08, 0.1, '#d4af37', { emissive: '#8a6a10', emissiveIntensity: 0.3 });
  ferrure.position.set(0, 0.12, 0.7);
  couvercle.add(plaque, ferrure);
  const serrure = boite(0.18, 0.2, 0.06, '#d4af37', { emissive: '#8a6a10', emissiveIntensity: 0.4 });
  serrure.position.set(0, 0.5, 0.37);
  g.add(caisse, couvercle, serrure);
  return {
    groupe: g,
    ouvrir(instantane = false) {
      couvercle.rotation.x = -1.9;
      serrure.visible = false;
      if (!instantane) g.userData.ouvertA = performance.now();
    },
  };
}

// Décor d'un lieu à découvrir, selon son type.
function creerLieu(l, lx, lz, contexte, hasard) {
  const { collisions, terrain } = contexte;
  const sol = (x, z) => terrain.hauteur(x, z);
  const g = new THREE.Group();
  g.position.set(lx, 0, lz);
  const obstacle = (x, z, r, h) => collisions.ajouterObstacle({ type: 'cercle', x: lx + x, z: lz + z, r, h });
  const pierre = '#a59c8a';

  switch (l.type) {
    case 'cercle': {
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        const x = Math.cos(a) * 7, z = Math.sin(a) * 7;
        const m = boite(1.1, hasard.entre(2.4, 3.6), 0.8, l.id === 'clairiere_fees' ? '#cfd8c8' : pierre);
        m.position.set(x, sol(lx + x, lz + z) + m.geometry.parameters.height / 2 - 0.2, z);
        m.rotation.y = -a;
        g.add(m);
        obstacle(x, z, 0.7, 3);
      }
      const centre = cylindre(1.2, 1.4, 0.5, '#d9cfb8', 8, { emissive: '#ffe9a8', emissiveIntensity: 0.25 });
      centre.position.y = sol(lx, lz) + 0.25;
      g.add(centre);
      break;
    }
    case 'ruines':
    case 'ferme': {
      const nb = l.type === 'ferme' ? 4 : 7;
      for (let k = 0; k < nb; k++) {
        const x = hasard.entre(-7, 7), z = hasard.entre(-7, 7);
        const h = hasard.entre(1, 4.5);
        const m = l.type === 'ferme' ? boite(hasard.entre(3, 6), h, 0.6, '#d9ccae') : cylindre(0.6, 0.7, h, pierre, 8);
        m.position.set(x, sol(lx + x, lz + z) + h / 2 - 0.2, z);
        m.rotation.y = hasard.entre(0, 3);
        g.add(m);
        obstacle(x, z, l.type === 'ferme' ? 1.2 : 0.75, h);
      }
      break;
    }
    case 'camp': {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        const x = Math.cos(a) * 9, z = Math.sin(a) * 9;
        const tente = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), mat(['#8b2e2e', '#c9b37a', '#6b4a2b', '#5a5f66'][k]));
        tente.position.set(x, sol(lx + x, lz + z) + 1.5, z);
        tente.rotation.y = a;
        tente.castShadow = true;
        g.add(tente);
        obstacle(x, z, 2, 3);
      }
      const feu = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 6), materiauToon({ color: '#ffb347', emissive: '#ff6a00', emissiveIntensity: 2 }));
      feu.position.y = sol(lx, lz) + 0.6;
      g.add(feu);
      contexte.animations.push((t) => { feu.scale.y = 1 + Math.sin(t * 9) * 0.15; });
      break;
    }
    case 'point_de_vue': {
      for (let k = 0; k < 4; k++) {
        const r = 1.2 - k * 0.25;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(pierre));
        m.position.y = sol(lx, lz) + 0.6 + k * 0.85;
        m.castShadow = true;
        g.add(m);
      }
      const mat2 = cylindre(0.06, 0.06, 3, '#5a3d2b', 5);
      mat2.position.y = sol(lx, lz) + 4.5;
      const drapeau = boite(1.2, 0.7, 0.05, '#2e86c1');
      drapeau.position.set(0.6, sol(lx, lz) + 5.6, 0);
      g.add(mat2, drapeau);
      obstacle(0, 0, 1.2, 4);
      break;
    }
    case 'pont': {
      // Le pont enjambe la rivière la plus proche, perpendiculairement à son cours.
      const riviere = riviereProche(contexte.monde, lx, lz);
      if (!riviere) break;
      const angle = Math.atan2(riviere.dx, riviere.dz) + Math.PI / 2;
      const longueur = riviere.largeur * 3 + 10;
      const ax = lx + Math.sin(angle) * longueur / 2, az = lz + Math.cos(angle) * longueur / 2;
      const bx = lx - Math.sin(angle) * longueur / 2, bz = lz - Math.cos(angle) * longueur / 2;
      const hauteurPont = Math.max(sol(ax, az), sol(bx, bz), terrain.niveauEau + 1.6) + 0.15;
      const tablier = boite(4, 0.4, longueur, '#8b5a2b');
      tablier.position.set(0, hauteurPont - 0.2, 0);
      tablier.rotation.y = angle;
      g.add(tablier);
      for (const sens of [1, -1]) {
        const garde = boite(0.2, 1, longueur, '#6b4a2b');
        garde.position.set(Math.cos(angle) * 1.9 * sens, hauteurPont + 0.5, -Math.sin(angle) * 1.9 * sens);
        garde.rotation.y = angle;
        g.add(garde);
        collisions.ajouterObstacle({ type: 'boite', x: lx + Math.cos(angle) * 1.9 * sens, z: lz - Math.sin(angle) * 1.9 * sens, demiL: 0.15, demiP: longueur / 2 - 2, angle, h: 1.2, base: hauteurPont - 0.2 });
      }
      collisions.ajouterSol({ type: 'boite', x: lx, z: lz, demiL: 2, demiP: longueur / 2, angle, h: hauteurPont });
      break;
    }
    case 'lac': {
      for (let k = 0; k < 12; k++) {
        const a = hasard.entre(0, 6.28), d = hasard.entre(4, 12);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const roseau = cylindre(0.05, 0.05, 1.4, '#6b8e23', 4);
        roseau.position.set(x, Math.max(sol(lx + x, lz + z), terrain.niveauEau) + 0.6, z);
        g.add(roseau);
      }
      break;
    }
    case 'arbre_ancien': {
      const tronc = cylindre(2, 3, 14, '#6b4a2b', 9);
      tronc.position.y = sol(lx, lz) + 7;
      const feuillage = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), mat('#3f7a35', { contour: 0.8 }));
      feuillage.position.y = sol(lx, lz) + 18;
      feuillage.castShadow = true;
      g.add(tronc, feuillage);
      obstacle(0, 0, 2.6, 14);
      break;
    }
    case 'statue': {
      const socle = boite(3, 1.4, 3, '#8d8576');
      socle.position.y = sol(lx, lz) + 0.7;
      const corps = boite(1.4, 3.4, 1, '#b8ae9c');
      corps.position.y = sol(lx, lz) + 3.1;
      const tete = boite(0.9, 0.9, 0.9, '#b8ae9c');
      tete.position.y = sol(lx, lz) + 5.3;
      g.add(socle, corps, tete);
      obstacle(0, 0, 2, 6);
      break;
    }
    case 'autel':
    case 'sanctuaire': {
      const dalle = cylindre(5, 5.5, 0.6, '#d9cfb8', 12);
      dalle.position.y = sol(lx, lz) + 0.3;
      g.add(dalle);
      const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), materiauToon({ color: l.type === 'autel' ? '#c8b6ff' : '#fff2a8', emissive: l.type === 'autel' ? '#8a6aff' : '#ffcf4a', emissiveIntensity: 1.4 }));
      cristal.position.y = sol(lx, lz) + 2.6;
      g.add(cristal);
      contexte.animations.push((t) => { cristal.rotation.y = t; cristal.position.y = sol(lx, lz) + 2.6 + Math.sin(t * 2) * 0.2; });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const x = Math.cos(a) * 4, z = Math.sin(a) * 4;
        const colonne = cylindre(0.4, 0.45, 4, '#e8e0cc', 8);
        colonne.position.set(x, sol(lx + x, lz + z) + 2, z);
        g.add(colonne);
        obstacle(x, z, 0.5, 4);
      }
      break;
    }
    case 'puits': {
      const puits = creerPuits();
      puits.position.y = sol(lx, lz);
      g.add(puits);
      obstacle(0, 0, 1.5, 3);
      break;
    }
    default:
      return null;
  }
  return g;
}

function riviereProche(monde, x, z) {
  let meilleur = null;
  for (const r of monde.terrain.eau?.rivieres || []) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, az] = r.points[i], [bx, bz] = r.points[i + 1];
      const dx = bx - ax, dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
      if (!meilleur || d < meilleur.d) meilleur = { d, dx, dz, largeur: r.largeur };
    }
  }
  return meilleur;
}
