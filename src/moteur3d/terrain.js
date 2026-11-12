// Terrain d'un monde ouvert, généré à partir de la graine (même graine = même monde).
// - Relief : bruit à plusieurs couches + montagnes sur les bords.
// - Rivières creusées le long de lignes brisées, plan d'eau.
// - Zones aplanies (village, tour, entrées de donjon, lieux).
// - Affichage par tronçons de 200 m : détaillés près du joueur, simplifiés au loin.
// - Végétation (arbres, rochers) dessinée en lots (instancing) avec obstacles.
import * as THREE from 'three';
import { creerBruit, creerHasard } from '../core/hasard.js';
import { materiauToon } from './materiaux.js';
import { fusionner } from './vegetation.js';

const lisser = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function distanceSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// zonesPlates : [{ x, z, r, marge }] — la hauteur naturelle au centre est conservée.
export function creerTerrain(monde, zonesPlates = []) {
  const { taille, terrain: def } = monde;
  const demi = taille / 2;
  const bruit = creerBruit(def.graine);
  const echelle = def.echelle || 90;
  const base = def.base || 0;
  const eau = def.eau || null;
  const rivieres = eau?.rivieres || [];

  function reliefNaturel(x, z) {
    let h = base + bruit(x / echelle + 50, z / echelle + 50, 5) * def.hauteurMax;
    h += Math.pow(bruit(x / (echelle * 3) + 10, z / (echelle * 3) + 10, 2), 2) * def.hauteurMax * 0.8;
    const bords = def.bords || { largeur: 30, hauteur: 22 };
    const bord = Math.max(Math.abs(x), Math.abs(z));
    if (bord > demi - bords.largeur) {
      const t = (bord - (demi - bords.largeur)) / bords.largeur;
      h += t * t * bords.hauteur * (0.7 + 0.6 * bruit(x / 60, z / 60, 2));
    }
    return h;
  }

  const plates = zonesPlates.map((p) => ({ marge: 20, ...p, h: reliefNaturel(p.x, p.z) }));
  if (def.zonePlate) {
    const p = def.zonePlate;
    plates.push({ x: p.centre[0], z: p.centre[1], r: p.rayon, marge: 25, h: def.hauteurMax * 0.35 });
  }
  if (eau) for (const p of plates) p.h = Math.max(p.h, eau.niveau + 1.5);

  function hauteurBrute(x, z) {
    let h = reliefNaturel(x, z);
    for (const p of plates) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + p.marge) h = p.h + (h - p.h) * lisser(p.r, p.r + p.marge, d);
    }
    if (eau) {
      // Hors des rivières, le sol reste au-dessus de l'eau.
      h = Math.max(h, eau.niveau + 1.2);
      for (const r of rivieres) {
        let d = Infinity;
        for (let i = 0; i < r.points.length - 1; i++) {
          d = Math.min(d, distanceSegment(x, z, ...r.points[i], ...r.points[i + 1]));
        }
        // Vallée large et douce, puis lit de la rivière sous l'eau.
        const fondVallee = eau.niveau + 2.2;
        if (d < r.largeur * 9 && h > fondVallee) h = fondVallee + (h - fondVallee) * Math.pow(lisser(r.largeur * 1.5, r.largeur * 9, d), 0.85);
        const lit = eau.niveau - 1.4;
        if (d < r.largeur * 2.2) h = lit + (h - lit) * lisser(r.largeur * 0.5, r.largeur * 2.2, d);
      }
    }
    return h;
  }

  // Grille de hauteurs (4 m de pas pour un grand monde, 2 m pour la zone de test).
  const pas = taille > 1000 ? 4 : 2;
  const segments = Math.round(taille / pas);
  const n = segments + 1;
  const hauteurs = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) hauteurs[j * n + i] = hauteurBrute(-demi + i * pas, -demi + j * pas);
  }

  function hauteur(x, z) {
    const fx = Math.min(segments - 0.0001, Math.max(0, (x + demi) / pas));
    const fz = Math.min(segments - 0.0001, Math.max(0, (z + demi) / pas));
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = hauteurs[j * n + i], b = hauteurs[j * n + i + 1];
    const c = hauteurs[(j + 1) * n + i], d = hauteurs[(j + 1) * n + i + 1];
    if (tx + tz <= 1) return a + (b - a) * tx + (c - a) * tz;
    return d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
  }

  function normale(x, z, cible) {
    const e = pas;
    return cible.set(hauteur(x - e, z) - hauteur(x + e, z), 2 * e, hauteur(x, z - e) - hauteur(x, z + e)).normalize();
  }

  // Couleur du sol selon la hauteur, la pente et la proximité de l'eau.
  const cSol = new THREE.Color(def.palette.sol);
  const cSol2 = new THREE.Color(def.palette.sol2 || def.palette.sol);
  const cRoche = new THREE.Color(def.palette.roche);
  const cSable = new THREE.Color(def.palette.sable || def.palette.sol2 || def.palette.sol);
  const nTmp = new THREE.Vector3();
  function couleur(x, z, h, c) {
    normale(x, z, nTmp);
    const pente = 1 - nTmp.y;
    c.copy(cSol).lerp(cSol2, bruit(x / 40, z / 40, 2));
    if (eau && h < eau.niveau + 2.2) c.lerp(cSable, lisser(eau.niveau + 2.2, eau.niveau + 0.8, h));
    c.lerp(cRoche, lisser(0.1, 0.3, pente));
    if (def.bords && h > base + def.hauteurMax * 1.4) c.lerp(cRoche, 0.6);
    return c;
  }

  // ---- Tronçons affichés ----
  const groupe = new THREE.Group();
  const materiauSol = materiauToon({ vertexColors: true, contour: 0, side: THREE.DoubleSide });
  const tailleTroncon = Math.min(200, taille / 2);
  const nbTroncons = Math.round(taille / tailleTroncon);
  const troncons = new Map();
  const c = new THREE.Color();

  function geometrieTroncon(ti, tj, resolution) {
    const x0 = -demi + ti * tailleTroncon, z0 = -demi + tj * tailleTroncon;
    const seg = Math.round(tailleTroncon / resolution);
    const m = seg + 1;
    const nbJupe = seg * 4;
    const total = m * m + nbJupe;
    const positions = new Float32Array(total * 3);
    const normales = new Float32Array(total * 3);
    const couleurs = new Float32Array(total * 3);
    const indices = [];
    const placer = (k, x, y, z) => {
      positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = z;
      normale(x, z, nTmp);
      normales[k * 3] = nTmp.x; normales[k * 3 + 1] = nTmp.y; normales[k * 3 + 2] = nTmp.z;
      couleur(x, z, y, c);
      couleurs[k * 3] = c.r; couleurs[k * 3 + 1] = c.g; couleurs[k * 3 + 2] = c.b;
    };
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < m; i++) {
        const x = x0 + i * resolution, z = z0 + j * resolution;
        placer(j * m + i, x, hauteur(x, z), z);
      }
    }
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * m + i, b = a + 1, d = a + m, e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    // « Jupe » : un rebord qui descend sous le sol pour cacher les fentes
    // entre un tronçon détaillé et un tronçon simplifié.
    const bord = [];
    for (let i = 0; i < seg; i++) bord.push(i);
    for (let j = 0; j < seg; j++) bord.push(j * m + seg);
    for (let i = seg; i > 0; i--) bord.push(seg * m + i);
    for (let j = seg; j > 0; j--) bord.push(j * m);
    bord.forEach((k, index) => {
      placer(m * m + index, positions[k * 3], positions[k * 3 + 1] - 6, positions[k * 3 + 2]);
    });
    for (let index = 0; index < bord.length; index++) {
      const a = bord[index], b = bord[(index + 1) % bord.length];
      const sa = m * m + index, sb = m * m + ((index + 1) % bord.length);
      indices.push(a, b, sa, b, sb, sa);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    g.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
    g.setIndex(indices);
    g.computeBoundingSphere();
    return g;
  }

  function construireTroncon(ti, tj, detaille) {
    const cleT = `${ti},${tj}`;
    let t = troncons.get(cleT);
    const resolution = detaille ? pas : Math.max(pas * 5, 20);
    if (t && t.resolution === resolution) return;
    const g = geometrieTroncon(ti, tj, resolution);
    if (!t) {
      t = { maillage: new THREE.Mesh(g, materiauSol), resolution };
      t.maillage.receiveShadow = true;
      groupe.add(t.maillage);
      troncons.set(cleT, t);
    } else {
      t.maillage.geometry.dispose();
      t.maillage.geometry = g;
      t.resolution = resolution;
    }
  }

  // Au départ : tout le monde en version simplifiée (rapide), puis détails autour du joueur.
  for (let tj = 0; tj < nbTroncons; tj++) for (let ti = 0; ti < nbTroncons; ti++) construireTroncon(ti, tj, taille <= 400);

  // Eau.
  if (eau) {
    const plan = new THREE.Mesh(
      new THREE.PlaneGeometry(taille, taille, 1, 1).rotateX(-Math.PI / 2),
      materiauToon({ color: def.palette.eau, transparent: true, opacity: 0.82, contour: 0.25, emissive: def.palette.eau, emissiveIntensity: 0.12 })
    );
    plan.position.y = eau.niveau;
    plan.receiveShadow = true;
    groupe.add(plan);
  }

  // ---- Végétation ----
  const obstacles = [];
  const hasard = creerHasard(def.graine + 1);
  const libre = (x, z, marge) => {
    for (const p of plates) if (Math.hypot(x - p.x, z - p.z) < p.r + marge) return false;
    if (Math.max(Math.abs(x), Math.abs(z)) > demi - 35) return false;
    const h = hauteur(x, z);
    if (eau && h < eau.niveau + 1.5) return false;
    return normale(x, z, nTmp).y > 0.82;
  };

  const lotTaille = Math.min(800, taille);
  const nbLots = Math.max(1, Math.round(taille / lotTaille));
  const lots = [];
  const geoTronc = new THREE.CylinderGeometry(0.22, 0.4, 2.2, 7);
  // Sapin : trois étages de cônes. Feuillu : plusieurs boules de feuillage.
  const geoSapin = fusionner([
    new THREE.ConeGeometry(1.9, 2.6, 8).translate(0, -1.0, 0),
    new THREE.ConeGeometry(1.5, 2.3, 8).translate(0, 0.3, 0),
    new THREE.ConeGeometry(1.05, 2.0, 8).translate(0, 1.5, 0),
  ]);
  const geoFeuillu = fusionner([
    new THREE.IcosahedronGeometry(1.7, 1).translate(0, 0, 0),
    new THREE.IcosahedronGeometry(1.25, 1).translate(1.1, -0.35, 0.4),
    new THREE.IcosahedronGeometry(1.2, 1).translate(-0.9, -0.3, -0.6),
    new THREE.IcosahedronGeometry(1.05, 1).translate(0.2, 0.95, -0.3),
  ]);
  const geoBuisson = fusionner([
    new THREE.IcosahedronGeometry(0.8, 1),
    new THREE.IcosahedronGeometry(0.6, 1).translate(0.6, -0.15, 0.2),
    new THREE.IcosahedronGeometry(0.55, 1).translate(-0.5, -0.2, -0.3),
  ]);
  const geoRocher = new THREE.DodecahedronGeometry(1, 0);
  const matTronc = materiauToon({ color: 0x7a5232, contour: 0.6 });
  const matFeuilles = materiauToon({ color: 0xffffff, contour: 0.8 });
  const matRocher = materiauToon({ color: def.palette.roche, contour: 0.7 });
  const listes = new Map();
  const nbArbres = def.vegetation?.arbres || 0;
  const nbRochers = def.vegetation?.rochers || 0;

  function lotDe(x, z) {
    const li = Math.min(nbLots - 1, Math.floor((x + demi) / lotTaille));
    const lj = Math.min(nbLots - 1, Math.floor((z + demi) / lotTaille));
    const k = lj * nbLots + li;
    if (!listes.has(k)) listes.set(k, { sapins: [], feuillus: [], rochers: [], buissons: [], cx: -demi + (li + 0.5) * lotTaille, cz: -demi + (lj + 0.5) * lotTaille });
    return listes.get(k);
  }

  for (let k = 0, places = 0; k < nbArbres * 4 && places < nbArbres; k++) {
    const x = hasard.entre(-demi, demi), z = hasard.entre(-demi, demi);
    // Grand monde : arbres regroupés en bosquets et forêts.
    if (taille > 1000 && bruit(x / 130 + 7, z / 130 + 7, 2) < 0.48 && hasard.suivant() < 0.85) continue;
    if (!libre(x, z, 4)) continue;
    const e = hasard.entre(0.8, 1.6);
    const sapin = hasard.suivant() < 0.6;
    lotDe(x, z)[sapin ? 'sapins' : 'feuillus'].push({ x, z, y: hauteur(x, z), e, a: hasard.entre(0, 6.28), teinte: hasard.entre(-0.05, 0.05) });
    obstacles.push({ type: 'cercle', x, z, r: 0.45 * e, h: 7 * e });
    places++;
    // Quelques buissons au pied des arbres (on peut les traverser).
    if (hasard.suivant() < 0.55) {
      const a = hasard.entre(0, 6.28), d = hasard.entre(1.6, 3.5);
      const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
      if (libre(bx, bz, 2)) lotDe(bx, bz).buissons.push({ x: bx, z: bz, y: hauteur(bx, bz), e: hasard.entre(0.7, 1.3), a: hasard.entre(0, 6.28), teinte: hasard.entre(-0.04, 0.04) });
    }
  }
  for (let k = 0, places = 0; k < nbRochers * 3 && places < nbRochers; k++) {
    const x = hasard.entre(-demi, demi), z = hasard.entre(-demi, demi);
    if (!libre(x, z, 3)) continue;
    const r = hasard.entre(0.6, 2.4);
    lotDe(x, z).rochers.push({ x, z, y: hauteur(x, z), r, rx: hasard.entre(0, 3), ry: hasard.entre(0, 3), rz: hasard.entre(0, 3), ay: hasard.entre(0.6, 1) });
    obstacles.push({ type: 'cercle', x, z, r: r * 0.9, h: r * 1.2 });
    places++;
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const axeY = new THREE.Vector3(0, 1, 0);
  const vert = new THREE.Color();
  const euler = new THREE.Euler();
  function instances(geo, mat, nombre) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, nombre));
    im.count = nombre;
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }
  for (const liste of listes.values()) {
    const lot = { cx: liste.cx, cz: liste.cz, maillages: [] };
    const troncs = instances(geoTronc, matTronc, liste.sapins.length + liste.feuillus.length);
    const sapins = instances(geoSapin, matFeuilles, liste.sapins.length);
    const feuillus = instances(geoFeuillu, matFeuilles, liste.feuillus.length);
    let it = 0;
    liste.sapins.forEach((a, i) => {
      q.setFromAxisAngle(axeY, a.a);
      s.set(a.e, a.e, a.e);
      troncs.setMatrixAt(it++, m4.compose(p.set(a.x, a.y + 1.1 * a.e, a.z), q, s));
      sapins.setMatrixAt(i, m4.compose(p.set(a.x, a.y + 3.9 * a.e, a.z), q, s));
      sapins.setColorAt(i, vert.setHSL(0.3 + a.teinte, 0.5, 0.3));
    });
    liste.feuillus.forEach((a, i) => {
      q.setFromAxisAngle(axeY, a.a);
      s.set(a.e, a.e * 1.25, a.e);
      troncs.setMatrixAt(it++, m4.compose(p.set(a.x, a.y + 1.1 * a.e, a.z), q, s));
      s.set(a.e, a.e * 0.9, a.e);
      feuillus.setMatrixAt(i, m4.compose(p.set(a.x, a.y + 3.6 * a.e, a.z), q, s));
      feuillus.setColorAt(i, vert.setHSL(0.24 + a.teinte, 0.55, 0.42));
    });
    const buissons = instances(geoBuisson, matFeuilles, liste.buissons.length);
    liste.buissons.forEach((a, i) => {
      q.setFromAxisAngle(axeY, a.a);
      s.set(a.e, a.e * 0.8, a.e);
      buissons.setMatrixAt(i, m4.compose(p.set(a.x, a.y + 0.35 * a.e, a.z), q, s));
      buissons.setColorAt(i, vert.setHSL(0.26 + a.teinte, 0.5, 0.33));
    });
    const rochers = instances(geoRocher, matRocher, liste.rochers.length);
    liste.rochers.forEach((r, i) => {
      q.setFromEuler(euler.set(r.rx, r.ry, r.rz));
      s.set(r.r, r.r * r.ay, r.r);
      rochers.setMatrixAt(i, m4.compose(p.set(r.x, r.y + r.r * 0.3, r.z), q, s));
    });
    for (const im of [troncs, sapins, feuillus, buissons, rochers]) {
      if (im.count === 0) continue;
      im.computeBoundingSphere();
      groupe.add(im);
      lot.maillages.push(im);
    }
    lots.push(lot);
  }

  let dernierTroncon = '';
  // À appeler quand le joueur bouge : détails et ombres seulement autour de lui.
  function mettreAJour(position) {
    if (taille <= 400) return;
    const ti = Math.floor((position.x + demi) / tailleTroncon);
    const tj = Math.floor((position.z + demi) / tailleTroncon);
    const cleT = `${ti},${tj}`;
    if (cleT === dernierTroncon) return;
    dernierTroncon = cleT;
    for (let j = 0; j < nbTroncons; j++) {
      for (let i = 0; i < nbTroncons; i++) construireTroncon(i, j, Math.abs(i - ti) <= 1 && Math.abs(j - tj) <= 1);
    }
    for (const lot of lots) {
      const ombres = Math.hypot(lot.cx - position.x, lot.cz - position.z) < lotTaille * 0.9;
      for (const m of lot.maillages) m.castShadow = ombres;
    }
  }

  // L'herbe pousse partout sauf dans l'eau, sur les pentes rocheuses et sur la place du village.
  function surHerbe(x, z) {
    const h = hauteur(x, z);
    if (eau && h < eau.niveau + 1.4) return false;
    if (Math.max(Math.abs(x), Math.abs(z)) > demi - 40) return false;
    for (const p of plates) if (p.r >= 40 && Math.hypot(x - p.x, z - p.z) < p.r - 25) return false;
    return normale(x, z, nTmp).y > 0.86;
  }

  return {
    groupe, hauteur, demi, taille, mettreAJour, couleur, surHerbe,
    obstaclesNaturels: obstacles,
    niveauEau: eau ? eau.niveau : -Infinity,
  };
}

// Sol plat d'un donjon (les murs sont des obstacles ajoutés à part).
export function creerSolPlat(taille) {
  return { groupe: new THREE.Group(), hauteur: () => 0, demi: taille / 2, taille, mettreAJour() {}, obstaclesNaturels: [], niveauEau: -Infinity };
}
