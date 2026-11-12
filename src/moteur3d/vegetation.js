// Détails de la nature autour du héros : herbe qui ondule, fleurs, nuages, pollens.
// L'herbe et les fleurs ne sont créées que dans un rayon autour du héros
// (positions stables : elles ne « sautent » pas quand on avance).
import * as THREE from 'three';
import { materiauToon } from './materiaux.js';

// Assemble plusieurs géométries en une seule (une seule instance = un seul dessin).
export function fusionner(geometries) {
  const morceaux = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = morceaux.reduce((s, g) => s + g.attributes.position.count, 0);
  const positions = new Float32Array(total * 3);
  const normales = new Float32Array(total * 3);
  const couleurs = morceaux.some((g) => g.attributes.color) ? new Float32Array(total * 3).fill(1) : null;
  let decalage = 0;
  for (const g of morceaux) {
    positions.set(g.attributes.position.array, decalage * 3);
    normales.set(g.attributes.normal.array, decalage * 3);
    if (couleurs && g.attributes.color) couleurs.set(g.attributes.color.array, decalage * 3);
    decalage += g.attributes.position.count;
  }
  const resultat = new THREE.BufferGeometry();
  resultat.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  resultat.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
  if (couleurs) resultat.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  resultat.computeBoundingSphere();
  return resultat;
}

// Hachage stable d'une case de la grille → nombre entre 0 et 1.
function hache(i, j, graine) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(graine, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Touffe de 3 brins : base sombre, pointe claire. Normales vers le haut :
// l'herbe prend la même lumière que le sol et s'y fond.
function geometrieTouffe() {
  const brins = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.BufferGeometry();
    const l = 0.07, h = 1;
    const p = [-l, 0, 0, l, 0, 0, l * 0.5, h * 0.55, 0, -l, 0, 0, l * 0.5, h * 0.55, 0, -l * 0.5, h * 0.55, 0, -l * 0.5, h * 0.55, 0, l * 0.5, h * 0.55, 0, 0.02, h, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(9).fill([0, 1, 0]).flat(), 3));
    const c = p.map((v, i) => (i % 3 === 1 ? 0.78 + v * 0.42 : 0)).filter((_, i) => i % 3 === 1);
    g.setAttribute('color', new THREE.Float32BufferAttribute(c.flatMap((v) => [v, v, v]), 3));
    g.rotateZ((k - 1) * 0.35);
    g.rotateY(k * 2.1);
    g.translate((k - 1) * 0.06, 0, (k % 2) * 0.05);
    brins.push(g);
  }
  return fusionner(brins);
}

function geometrieFleur() {
  const tige = new THREE.CylinderGeometry(0.012, 0.015, 0.45, 3).translate(0, 0.22, 0);
  const tete = new THREE.IcosahedronGeometry(0.075, 0).scale(1, 0.6, 1).translate(0, 0.47, 0);
  const vert = (g, c) => g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(c).flat(), 3));
  const tigeNI = tige.index ? tige.toNonIndexed() : tige;
  const teteNI = tete.index ? tete.toNonIndexed() : tete;
  vert(tigeNI, [0.35, 0.55, 0.25]);
  vert(teteNI, [1, 1, 1]);
  return fusionner([tigeNI, teteNI]);
}

// terrain : { hauteur, couleur, surHerbe(x, z) }
export function creerHerbe(terrain, graine) {
  const RAYON = 52;
  const PAS = 0.62;
  const MAX = 16000;
  const MAX_FLEURS = 1400;
  const groupe = new THREE.Group();
  const touffes = new THREE.InstancedMesh(geometrieTouffe(), materiauToon({ vertexColors: true, contour: 0, vent: 0.18, side: THREE.DoubleSide }), MAX);
  const fleurs = new THREE.InstancedMesh(geometrieFleur(), materiauToon({ vertexColors: true, contour: 0.3, vent: 0.12 }), MAX_FLEURS);
  for (const im of [touffes, fleurs]) {
    im.count = 0;
    im.receiveShadow = true;
    im.frustumCulled = false; // l'ensemble entoure toujours le héros
    groupe.add(im);
  }
  const couleursFleurs = ['#ffffff', '#ffe066', '#c79bff', '#ff8fb1', '#8fd3ff'].map((c) => new THREE.Color(c));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const axe = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  let centre = null;

  function remplir(x0, z0) {
    let n = 0, nf = 0;
    const i0 = Math.floor((x0 - RAYON) / PAS), i1 = Math.ceil((x0 + RAYON) / PAS);
    const j0 = Math.floor((z0 - RAYON) / PAS), j1 = Math.ceil((z0 + RAYON) / PAS);
    for (let j = j0; j <= j1 && n < MAX; j++) {
      for (let i = i0; i <= i1 && n < MAX; i++) {
        const r = hache(i, j, graine);
        const x = (i + hache(i, j, graine + 1)) * PAS, z = (j + hache(i, j, graine + 2)) * PAS;
        const d = Math.hypot(x - x0, z - z0);
        if (d > RAYON) continue;
        // Prairies plus ou moins denses selon l'endroit.
        const densite = 0.55 + 0.45 * Math.sin(x * 0.045 + Math.sin(z * 0.031) * 2) * Math.cos(z * 0.038);
        if (r > densite) continue;
        if (!terrain.surHerbe(x, z)) continue;
        const y = terrain.hauteur(x, z);
        // Les touffes rapetissent au bord du cercle : pas de limite visible.
        const fondu = Math.min(1, (RAYON - d) / 14);
        const taille = (0.24 + hache(i, j, graine + 3) * 0.34) * fondu;
        q.setFromAxisAngle(axe, r * 40);
        s.set(taille * 1.6, taille, taille * 1.6);
        touffes.setMatrixAt(n, m.compose(p.set(x, y - 0.03, z), q, s));
        terrain.couleur(x, z, y, c);
        c.multiplyScalar(0.9 + hache(i, j, graine + 4) * 0.3);
        touffes.setColorAt(n, c);
        n++;
        if (nf < MAX_FLEURS && hache(i, j, graine + 5) < 0.07 * densite) {
          s.setScalar((0.7 + r * 0.6) * fondu);
          fleurs.setMatrixAt(nf, m.compose(p.set(x + 0.15, y - 0.02, z), q, s));
          fleurs.setColorAt(nf, couleursFleurs[Math.floor(hache(i, j, graine + 6) * couleursFleurs.length)]);
          nf++;
        }
      }
    }
    touffes.count = n;
    fleurs.count = nf;
    for (const im of [touffes, fleurs]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  return {
    groupe,
    // Replace l'herbe quand le héros s'est éloigné de plus de 9 m du dernier centre.
    mettreAJour(position) {
      if (centre && Math.hypot(position.x - centre.x, position.z - centre.z) < 9) return;
      centre = { x: position.x, z: position.z };
      remplir(position.x, position.z);
    },
  };
}

// Nuages blancs qui dérivent lentement, au-dessus du monde.
export function creerNuages(taille, graine) {
  const boules = [];
  for (let k = 0; k < 6; k++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const a = (k / 6) * Math.PI * 2;
    g.scale(1 + (k % 3) * 0.25, 0.65 + (k % 2) * 0.2, 1 + (k % 2) * 0.3);
    g.translate(Math.cos(a) * 1.4 * (k % 2 ? 1 : 0.6), (k % 3) * 0.25, Math.sin(a) * 0.9);
    boules.push(g);
  }
  boules.push(new THREE.IcosahedronGeometry(1.5, 1).scale(1.3, 0.8, 1));
  const geometrie = fusionner(boules);
  const nombre = 34;
  const nuages = new THREE.InstancedMesh(
    geometrie,
    materiauToon({ color: '#ffffff', emissive: '#c9d8f0', emissiveIntensity: 0.45, contour: 0.4, fog: false }),
    nombre
  );
  nuages.frustumCulled = false;
  const liste = [];
  for (let k = 0; k < nombre; k++) {
    liste.push({
      x: (hache(k, 1, graine) - 0.5) * taille * 1.6,
      z: (hache(k, 2, graine) - 0.5) * taille * 1.6,
      y: 230 + hache(k, 3, graine) * 120,
      e: 14 + hache(k, 4, graine) * 22,
      a: hache(k, 5, graine) * 6.28,
    });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const axe = new THREE.Vector3(0, 1, 0);
  const limite = taille * 0.8;
  return {
    groupe: nuages,
    mettreAJour(dt) {
      liste.forEach((n, k) => {
        n.x += dt * 2.2;
        if (n.x > limite) n.x = -limite;
        q.setFromAxisAngle(axe, n.a);
        s.set(n.e, n.e * 0.6, n.e * 0.8);
        nuages.setMatrixAt(k, m.compose(p.set(n.x, n.y, n.z), q, s));
      });
      nuages.instanceMatrix.needsUpdate = true;
    },
  };
}

// Petites particules lumineuses (pollen) qui flottent autour du héros.
export function creerPollen() {
  const nombre = 220;
  const positions = new Float32Array(nombre * 3);
  const phases = new Float32Array(nombre);
  for (let k = 0; k < nombre; k++) {
    positions.set([(Math.random() - 0.5) * 50, Math.random() * 6, (Math.random() - 0.5) * 50], k * 3);
    phases[k] = Math.random() * 10;
  }
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // Petit disque flou dessiné dans un canvas (aucune image téléchargée).
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  const degrade = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  degrade.addColorStop(0, 'rgba(255,255,255,1)');
  degrade.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  degrade.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = degrade;
  g.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  const points = new THREE.Points(geometrie, new THREE.PointsMaterial({ color: '#fff3c4', map: texture, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  let temps = 0;
  return {
    groupe: points,
    mettreAJour(dt, centre, sol) {
      temps += dt;
      for (let k = 0; k < nombre; k++) {
        let x = positions[k * 3], y = positions[k * 3 + 1], z = positions[k * 3 + 2];
        x += Math.sin(temps * 0.5 + phases[k]) * dt * 0.4 + dt * 0.25;
        z += Math.cos(temps * 0.4 + phases[k] * 1.3) * dt * 0.4;
        y += Math.sin(temps * 0.8 + phases[k]) * dt * 0.15;
        // Les particules qui sortent de la zone reviennent de l'autre côté.
        if (x - centre.x > 25) x -= 50;
        if (x - centre.x < -25) x += 50;
        if (z - centre.z > 25) z -= 50;
        if (z - centre.z < -25) z += 50;
        const s = sol(x, z);
        if (y < s + 0.3 || y > s + 6) y = s + 0.5 + Math.random() * 4;
        positions[k * 3] = x; positions[k * 3 + 1] = y; positions[k * 3 + 2] = z;
      }
      geometrie.attributes.position.needsUpdate = true;
    },
  };
}
