// Relief généré à partir de la graine du monde, végétation et obstacles.
// Même graine = même terrain à chaque partie, sans stocker de carte.
import * as THREE from 'three';
import { creerBruit, creerHasard } from '../core/hasard.js';

export function creerTerrain(monde) {
  const { taille, terrain: def } = monde;
  const demi = taille / 2;
  const bruit = creerBruit(def.graine);
  const plat = def.zonePlate;

  // Hauteur du sol en (x, z), calculée directement par la formule.
  function hauteurBrute(x, z) {
    const e = def.echelle || 90;
    let h = bruit(x / e + 50, z / e + 50, 4) * def.hauteurMax;
    h += Math.pow(bruit(x / (e * 3) + 10, z / (e * 3) + 10, 2), 2) * def.hauteurMax * 0.8;
    // Zone plate autour du départ.
    if (plat) {
      const d = Math.hypot(x - plat.centre[0], z - plat.centre[1]);
      const t = Math.min(1, Math.max(0, (d - plat.rayon) / 25));
      const hPlat = def.hauteurMax * 0.35;
      h = hPlat + (h - hPlat) * t * t;
    }
    // Les bords de la carte remontent en falaises pour fermer la zone.
    const bord = Math.max(Math.abs(x), Math.abs(z));
    if (bord > demi - 30) h += Math.pow((bord - (demi - 30)) / 30, 2) * 22;
    return h;
  }

  // Grille de hauteurs précalculée (plus rapide que le bruit à chaque appel).
  const segments = Math.round(taille / 2);
  const pas = taille / segments;
  const n = segments + 1;
  const hauteurs = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      hauteurs[j * n + i] = hauteurBrute(-demi + i * pas, -demi + j * pas);
    }
  }

  function hauteur(x, z) {
    const fx = Math.min(segments - 0.0001, Math.max(0, (x + demi) / pas));
    const fz = Math.min(segments - 0.0001, Math.max(0, (z + demi) / pas));
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = hauteurs[j * n + i], b = hauteurs[j * n + i + 1];
    const c = hauteurs[(j + 1) * n + i], d = hauteurs[(j + 1) * n + i + 1];
    // Même découpage en triangles que le maillage, pour coller au sol affiché.
    if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
    return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
  }

  // Maillage du sol, coloré selon la hauteur et la pente.
  const geometrie = new THREE.PlaneGeometry(taille, taille, segments, segments);
  geometrie.rotateX(-Math.PI / 2);
  const positions = geometrie.attributes.position;
  for (let k = 0; k < positions.count; k++) {
    positions.setY(k, hauteur(positions.getX(k), positions.getZ(k)));
  }
  geometrie.computeVertexNormals();
  const normales = geometrie.attributes.normal;
  const couleurs = new Float32Array(positions.count * 3);
  const cSol = new THREE.Color(def.palette.sol);
  const cSol2 = new THREE.Color(def.palette.sol2 || def.palette.sol);
  const cRoche = new THREE.Color(def.palette.roche);
  const c = new THREE.Color();
  const hasardCouleur = creerHasard(def.graine + 7);
  for (let k = 0; k < positions.count; k++) {
    const pente = 1 - normales.getY(k);
    const varie = bruit(positions.getX(k) / 18, positions.getZ(k) / 18, 2);
    c.copy(cSol).lerp(cSol2, varie);
    c.lerp(cRoche, Math.min(1, Math.max(0, (pente - 0.12) * 4)));
    c.offsetHSL(0, 0, (hasardCouleur.suivant() - 0.5) * 0.03);
    couleurs.set([c.r, c.g, c.b], k * 3);
  }
  geometrie.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  const sol = new THREE.Mesh(
    geometrie,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })
  );
  sol.receiveShadow = true;

  const groupe = new THREE.Group();
  groupe.add(sol);

  // Végétation et rochers : dessinés en une seule fois par type (instancing).
  const obstacles = [];
  const hasard = creerHasard(def.graine + 1);
  const libre = (x, z, marge) => {
    if (plat && Math.hypot(x - plat.centre[0], z - plat.centre[1]) < plat.rayon + marge) return false;
    return Math.max(Math.abs(x), Math.abs(z)) < demi - 35;
  };

  const nbArbres = def.vegetation?.arbres || 0;
  const tronc = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.25, 0.35, 2.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true }),
    nbArbres
  );
  const feuillage = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.8, 4.2, 7),
    new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 0.9 }),
    nbArbres
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const vert = new THREE.Color();
  let placesArbres = 0;
  for (let k = 0; k < nbArbres * 3 && placesArbres < nbArbres; k++) {
    const x = hasard.entre(-demi, demi), z = hasard.entre(-demi, demi);
    if (!libre(x, z, 4)) continue;
    const y = hauteur(x, z);
    const echelle = hasard.entre(0.8, 1.5);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hasard.entre(0, Math.PI * 2));
    s.set(echelle, echelle, echelle);
    tronc.setMatrixAt(placesArbres, m.compose(p.set(x, y + 1.1 * echelle, z), q, s));
    feuillage.setMatrixAt(placesArbres, m.compose(p.set(x, y + 4 * echelle, z), q, s));
    feuillage.setColorAt(placesArbres, vert.setHSL(0.27 + hasard.entre(-0.04, 0.04), 0.5, 0.28 + hasard.entre(-0.05, 0.05)));
    obstacles.push({ x, z, r: 0.45 * echelle, h: 6 * echelle });
    placesArbres++;
  }
  tronc.count = feuillage.count = placesArbres;
  for (const maillage of [tronc, feuillage]) {
    maillage.castShadow = true;
    maillage.receiveShadow = true;
    groupe.add(maillage);
  }

  const nbRochers = def.vegetation?.rochers || 0;
  const rochers = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: def.palette.roche, flatShading: true, roughness: 1 }),
    nbRochers
  );
  let placesRochers = 0;
  for (let k = 0; k < nbRochers * 3 && placesRochers < nbRochers; k++) {
    const x = hasard.entre(-demi, demi), z = hasard.entre(-demi, demi);
    if (!libre(x, z, 3)) continue;
    const r = hasard.entre(0.6, 2.2);
    q.setFromEuler(new THREE.Euler(hasard.entre(0, 3), hasard.entre(0, 3), hasard.entre(0, 3)));
    s.set(r, r * hasard.entre(0.6, 1), r);
    rochers.setMatrixAt(placesRochers, m.compose(p.set(x, hauteur(x, z) + r * 0.3, z), q, s));
    obstacles.push({ x, z, r: r * 0.9, h: r * 1.2 });
    placesRochers++;
  }
  rochers.count = placesRochers;
  rochers.castShadow = rochers.receiveShadow = true;
  groupe.add(rochers);

  // Grille de recherche rapide des obstacles proches.
  const tailleCase = 10;
  const grille = new Map();
  const cle = (cx, cz) => `${cx},${cz}`;
  for (const o of obstacles) {
    const k = cle(Math.floor(o.x / tailleCase), Math.floor(o.z / tailleCase));
    if (!grille.has(k)) grille.set(k, []);
    grille.get(k).push(o);
  }
  function obstaclesProches(x, z) {
    const cx = Math.floor(x / tailleCase), cz = Math.floor(z / tailleCase);
    const liste = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cellule = grille.get(cle(cx + dx, cz + dz));
        if (cellule) liste.push(...cellule);
      }
    }
    return liste;
  }

  return { groupe, hauteur, obstaclesProches, demi, taille };
}
