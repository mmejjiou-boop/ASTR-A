// Modèles 3D low poly construits en code (aucun fichier de modèle téléchargé).
// Tous les modèles regardent vers +z. Les parties animées ont un nom.
import * as THREE from 'three';
import { materiauToon } from './materiaux.js';

const cacheMateriaux = new Map();
function materiau(couleur, options = {}) {
  const cle = couleur + JSON.stringify(options);
  if (!cacheMateriaux.has(cle)) {
    cacheMateriaux.set(cle, materiauToon({ color: couleur, ...options }));
  }
  return cacheMateriaux.get(cle);
}

function boite(l, h, p, couleur) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau(couleur));
  m.castShadow = true;
  return m;
}
function cylindre(r1, r2, h, couleur, cotes = 6) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, cotes), materiau(couleur));
  m.castShadow = true;
  return m;
}
function sphere(r, couleur, details = 0) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, details), materiau(couleur));
  m.castShadow = true;
  return m;
}

// Un membre qui pivote à son sommet (épaule, hanche).
function membre(l, h, p, couleur) {
  const pivot = new THREE.Group();
  const forme = boite(l, h, p, couleur);
  forme.position.y = -h / 2;
  pivot.add(forme);
  return pivot;
}

// Armes : posées dans la main, la lame vers l'avant/le haut.
export function creerArme(categorie, couleurs) {
  const [c1, c2] = couleurs;
  const g = new THREE.Group();
  const lame = (longueur, largeur) => {
    const l = boite(largeur, longueur, 0.05, '#d8dde3');
    l.position.y = longueur / 2 + 0.15;
    g.add(l);
    const garde = boite(largeur * 3, 0.06, 0.1, c1);
    garde.position.y = 0.12;
    g.add(garde);
    g.add(boite(0.07, 0.25, 0.07, c2));
  };
  switch (categorie) {
    case 'epee': lame(0.9, 0.09); break;
    case 'epee2m': lame(1.3, 0.13); break;
    case 'katana': { lame(1.0, 0.06); break; }
    case 'dagues': lame(0.4, 0.07); break;
    case 'hache':
    case 'masse': {
      const manche = cylindre(0.04, 0.04, 1.1, c2);
      manche.position.y = 0.4;
      g.add(manche);
      const tete = categorie === 'hache' ? boite(0.5, 0.35, 0.06, '#c0c4c8') : sphere(0.18, '#9aa0a6');
      tete.position.set(categorie === 'hache' ? 0.2 : 0, 0.9, 0);
      g.add(tete);
      break;
    }
    case 'faux': {
      const manche = cylindre(0.035, 0.035, 1.7, c2);
      manche.position.y = 0.6;
      g.add(manche);
      const lameF = boite(0.7, 0.08, 0.04, '#c8d0c8');
      lameF.position.set(0.3, 1.4, 0);
      lameF.rotation.z = -0.3;
      g.add(lameF);
      break;
    }
    case 'baton':
    case 'sceptre': {
      const manche = cylindre(0.035, 0.045, 1.6, c2);
      manche.position.y = 0.55;
      g.add(manche);
      const gemme = sphere(0.12, c1, 0);
      gemme.material = materiau(c1, { emissive: c1, emissiveIntensity: 0.6 });
      gemme.position.y = 1.4;
      g.add(gemme);
      break;
    }
    case 'arc': {
      for (const sens of [1, -1]) {
        const branche = cylindre(0.025, 0.03, 0.75, c2);
        branche.position.y = sens * 0.33;
        branche.rotation.x = sens * 0.35;
        branche.position.z = -0.12;
        g.add(branche);
      }
      break;
    }
    case 'grimoire': {
      const livre = boite(0.3, 0.38, 0.1, c1);
      livre.position.set(0, 0.05, 0.1);
      g.add(livre);
      break;
    }
    case 'orbe': {
      const orbe = sphere(0.16, c1, 1);
      orbe.material = materiau(c1, { emissive: c1, emissiveIntensity: 0.8 });
      orbe.position.set(0, 0.1, 0.15);
      g.add(orbe);
      break;
    }
    case 'gantelets': {
      const gant = boite(0.18, 0.2, 0.2, c1);
      gant.material = materiau(c1, { emissive: c1, emissiveIntensity: 0.4 });
      g.add(gant);
      break;
    }
    default: lame(0.8, 0.08);
  }
  return g;
}

function creerBouclier(couleurs) {
  const g = new THREE.Group();
  const plaque = boite(0.55, 0.65, 0.08, couleurs[0]);
  const bord = boite(0.6, 0.08, 0.1, couleurs[1]);
  bord.position.y = 0.3;
  g.add(plaque, bord);
  return g;
}

// Héros humanoïde aux couleurs de sa classe.
export function creerHeros(classe, arme, bouclier) {
  const { principale, secondaire } = classe.couleurs;
  const peau = '#e0b48a';
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  corps.position.y = 0.95;
  racine.add(corps);

  const torse = boite(0.56, 0.62, 0.32, principale);
  torse.position.y = 0.35;
  corps.add(torse);
  const ceinture = boite(0.58, 0.1, 0.34, secondaire);
  ceinture.position.y = 0.06;
  corps.add(ceinture);

  const tete = new THREE.Group();
  tete.position.y = 0.88;
  const visage = boite(0.32, 0.34, 0.32, peau);
  const cheveux = boite(0.34, 0.12, 0.34, '#3a2a1a');
  cheveux.position.y = 0.17;
  const nuque = boite(0.34, 0.26, 0.08, '#3a2a1a');
  nuque.position.set(0, 0.04, -0.15);
  const yeux = boite(0.22, 0.05, 0.02, '#1a1a22');
  yeux.position.set(0, 0.03, 0.165);
  tete.add(visage, cheveux, nuque, yeux);
  corps.add(tete);

  const brasG = membre(0.16, 0.6, 0.16, principale);
  brasG.position.set(0.37, 0.62, 0);
  const brasD = membre(0.16, 0.6, 0.16, principale);
  brasD.position.set(-0.37, 0.62, 0);
  corps.add(brasG, brasD);

  const jambeG = membre(0.2, 0.9, 0.2, '#3a3a44');
  jambeG.position.set(0.14, 0, 0);
  const jambeD = membre(0.2, 0.9, 0.2, '#3a3a44');
  jambeD.position.set(-0.14, 0, 0);
  corps.add(jambeG, jambeD);

  // Arme dans la main droite.
  const main = new THREE.Group();
  main.position.y = -0.6;
  brasD.add(main);
  if (arme) {
    const modeleArme = creerArme(arme.modele.forme, arme.modele.couleurs);
    modeleArme.rotation.x = Math.PI / 2;
    main.add(modeleArme);
  }
  if (bouclier) {
    const b = creerBouclier(bouclier.modele.couleurs);
    b.position.set(0.12, -0.35, 0.05);
    b.rotation.y = Math.PI / 2;
    brasG.add(b);
  }

  // Bulle du bouclier divin, masquée par défaut.
  const bulle = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    materiauToon({ color: 0x9fd0ff, transparent: true, opacity: 0.25, emissive: 0x5aa0ff, emissiveIntensity: 0.6, depthWrite: false })
  );
  bulle.position.y = 1;
  bulle.visible = false;
  racine.add(bulle);

  racine.userData.parties = { corps, torse, tete, brasG, brasD, jambeG, jambeD, bulle };
  racine.userData.type = 'humanoide';
  return racine;
}

// Monstres : quelques gabarits réutilisables, réglés par les données.
export function creerModeleMonstre(modele) {
  const [c1, c2] = modele.couleurs;
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  racine.add(corps);
  let parties;

  if (modele.forme === 'quadrupede') {
    corps.position.y = 0.75;
    const tronc = boite(0.55, 0.5, 1.2, c1);
    corps.add(tronc);
    const tete = new THREE.Group();
    tete.position.set(0, 0.25, 0.65);
    const crane = boite(0.42, 0.38, 0.45, c1);
    const museau = boite(0.24, 0.2, 0.32, c2);
    museau.position.set(0, -0.06, 0.32);
    const oreilleG = boite(0.1, 0.18, 0.06, c2);
    oreilleG.position.set(0.13, 0.25, -0.08);
    const oreilleD = oreilleG.clone();
    oreilleD.position.x = -0.13;
    const oeilG = boite(0.06, 0.06, 0.02, '#ffd23a');
    oeilG.material = materiau('#ffd23a', { emissive: '#ff9a00', emissiveIntensity: 0.6 });
    oeilG.position.set(0.12, 0.05, 0.23);
    const oeilD = oeilG.clone();
    oeilD.position.x = -0.12;
    tete.add(crane, museau, oreilleG, oreilleD, oeilG, oeilD);
    corps.add(tete);
    const queue = boite(0.12, 0.12, 0.55, c2);
    queue.position.set(0, 0.15, -0.8);
    queue.rotation.x = 0.5;
    corps.add(queue);
    const pattes = [];
    for (const [x, z] of [[0.2, 0.42], [-0.2, 0.42], [0.2, -0.42], [-0.2, -0.42]]) {
      const patte = membre(0.13, 0.55, 0.13, c2);
      patte.position.set(x, -0.15, z);
      corps.add(patte);
      pattes.push(patte);
    }
    parties = { corps, tete, pattes, queue };
    racine.userData.type = 'quadrupede';
  } else {
    // humanoide_trapu
    corps.position.y = 0.75;
    const torse = boite(0.6, 0.55, 0.4, c1);
    torse.position.y = 0.3;
    const pagne = boite(0.62, 0.2, 0.42, c2);
    pagne.position.y = 0;
    corps.add(torse, pagne);
    const tete = new THREE.Group();
    tete.position.y = 0.78;
    const crane = boite(0.45, 0.4, 0.4, c1);
    const nez = boite(0.1, 0.16, 0.14, c1);
    nez.position.set(0, -0.02, 0.24);
    const oreilleG = boite(0.25, 0.08, 0.06, c1);
    oreilleG.position.set(0.3, 0.05, 0);
    oreilleG.rotation.z = 0.4;
    const oreilleD = oreilleG.clone();
    oreilleD.position.x = -0.3;
    oreilleD.rotation.z = -0.4;
    const oeilG = boite(0.07, 0.05, 0.02, '#ff3a2a');
    oeilG.material = materiau('#ff3a2a', { emissive: '#ff2000', emissiveIntensity: 0.7 });
    oeilG.position.set(0.1, 0.06, 0.205);
    const oeilD = oeilG.clone();
    oeilD.position.x = -0.1;
    tete.add(crane, nez, oreilleG, oreilleD, oeilG, oeilD);
    corps.add(tete);
    const brasG = membre(0.16, 0.55, 0.16, c1);
    brasG.position.set(0.4, 0.5, 0);
    const brasD = membre(0.16, 0.55, 0.16, c1);
    brasD.position.set(-0.4, 0.5, 0);
    corps.add(brasG, brasD);
    const main = new THREE.Group();
    main.position.y = -0.55;
    brasD.add(main);
    const lame = creerArme('epee', ['#7a5a3a', '#4a3a2a']);
    lame.scale.setScalar(0.8);
    lame.rotation.x = Math.PI / 2;
    main.add(lame);
    const jambeG = membre(0.2, 0.75, 0.2, c2);
    jambeG.position.set(0.15, 0, 0);
    const jambeD = membre(0.2, 0.75, 0.2, c2);
    jambeD.position.set(-0.15, 0, 0);
    corps.add(jambeG, jambeD);
    parties = { corps, torse, tete, brasG, brasD, jambeG, jambeD };
    racine.userData.type = 'humanoide';
  }
  racine.scale.setScalar(modele.taille || 1);
  racine.userData.parties = parties;
  return racine;
}
