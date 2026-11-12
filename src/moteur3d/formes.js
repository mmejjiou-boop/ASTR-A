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

// Membre arrondi (capsule) qui pivote à son sommet (épaule, hanche).
function membreArrondi(rayon, longueur, couleur, couleurBout = null) {
  const pivot = new THREE.Group();
  const forme = new THREE.Mesh(new THREE.CapsuleGeometry(rayon, longueur, 3, 8), materiau(couleur));
  forme.position.y = -longueur / 2 - rayon * 0.5;
  forme.castShadow = true;
  pivot.add(forme);
  if (couleurBout) {
    // Main ou botte au bout du membre.
    const bout = new THREE.Mesh(new THREE.SphereGeometry(rayon * 1.25, 10, 8), materiau(couleurBout));
    bout.position.y = -longueur - rayon * 0.8;
    bout.castShadow = true;
    pivot.add(bout);
  }
  return pivot;
}

// Héros humanoïde aux couleurs de sa classe : formes arrondies, tunique, visage.
export function creerHeros(classe, arme, bouclier, options = {}) {
  const { principale, secondaire } = classe.couleurs;
  const peau = options.peau || '#e9bf94';
  const couleurCheveux = options.cheveux || '#3a2a1a';
  const couleurJambes = options.jambes || '#3d3a48';
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  corps.position.y = 0.95;
  racine.add(corps);

  // Buste (tronc de cône arrondi) et tunique qui descend sur les cuisses.
  const torse = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.62, 12), materiau(principale));
  torse.position.y = 0.36;
  torse.castShadow = true;
  const epaules = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), materiau(principale));
  epaules.position.y = 0.66;
  epaules.scale.set(1.05, 0.45, 0.85);
  const tunique = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.33, 0.38, 12, 1, true), materiau(principale, { side: THREE.DoubleSide }));
  tunique.position.y = -0.08;
  tunique.castShadow = true;
  const ceinture = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.045, 6, 16), materiau(secondaire));
  ceinture.rotation.x = Math.PI / 2;
  ceinture.position.y = 0.1;
  const boucle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.04), materiau('#e8c35a', { emissive: '#8a6a10', emissiveIntensity: 0.25 }));
  boucle.position.set(0, 0.1, 0.27);
  // Col et bordure aux couleurs secondaires.
  const col = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 14), materiau(secondaire));
  col.rotation.x = Math.PI / 2;
  col.position.y = 0.7;
  corps.add(torse, epaules, tunique, ceinture, boucle, col);

  // Tête ronde, cheveux, yeux et oreilles.
  const tete = new THREE.Group();
  tete.position.y = 0.94;
  const visage = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), materiau(peau));
  visage.scale.set(1, 1.08, 0.98);
  visage.castShadow = true;
  const cheveux = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), materiau(couleurCheveux));
  cheveux.position.y = 0.03;
  cheveux.rotation.x = -0.25;
  const meche = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), materiau(couleurCheveux));
  meche.position.set(0.08, 0.12, 0.15);
  meche.rotation.set(1.2, 0, -0.5);
  const nuque = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), materiau(couleurCheveux));
  nuque.position.set(0, -0.02, -0.08);
  nuque.scale.set(1.1, 1, 0.8);
  const oeilG = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), materiau('#1c1c28'));
  oeilG.position.set(0.075, -0.01, 0.185);
  oeilG.scale.set(1, 1.35, 0.6);
  const oeilD = oeilG.clone();
  oeilD.position.x = -0.075;
  const oreilleG = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), materiau(peau));
  oreilleG.position.set(0.195, -0.01, 0);
  oreilleG.scale.set(0.5, 1, 0.8);
  const oreilleD = oreilleG.clone();
  oreilleD.position.x = -0.195;
  tete.add(visage, cheveux, meche, nuque, oeilG, oeilD, oreilleG, oreilleD);
  corps.add(tete);

  const brasG = membreArrondi(0.075, 0.42, principale, peau);
  brasG.position.set(0.34, 0.62, 0);
  const brasD = membreArrondi(0.075, 0.42, principale, peau);
  brasD.position.set(-0.34, 0.62, 0);
  corps.add(brasG, brasD);

  const jambeG = membreArrondi(0.09, 0.74, couleurJambes, '#4a3426');
  jambeG.position.set(0.13, 0, 0);
  const jambeD = membreArrondi(0.09, 0.74, couleurJambes, '#4a3426');
  jambeD.position.set(-0.13, 0, 0);
  corps.add(jambeG, jambeD);

  // Arme dans la main droite.
  const main = new THREE.Group();
  main.position.y = -0.58;
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
  racine.userData.hauteurCorps = 0.95;
  return racine;
}

// Humanoïde générique (PNJ, bandits) : mêmes proportions que le héros.
// apparence : { couleurs: [vêtement, accent], cheveux, peau, accessoire, age, taille, arme }
export function creerHumanoide(apparence) {
  const [principale, secondaire] = apparence.couleurs;
  const classe = { couleurs: { principale, secondaire } };
  const accessoire = apparence.arme || apparence.accessoire;
  const armes = { baton: ['baton', ['#7ff0ff', '#6b4a2b']], epee: ['epee', ['#c9a227', '#3a2a1a']], arc: ['arc', ['#c9b37a', '#6b4a2b']], marteau: ['masse', ['#5a5f66', '#5a3d2b']], masse: ['masse', ['#5a5f66', '#5a3d2b']] };
  const arme = armes[accessoire] ? { modele: { forme: armes[accessoire][0], couleurs: armes[accessoire][1] } } : null;
  const modele = creerHeros(classe, arme, null, { cheveux: apparence.cheveux, peau: apparence.peau, jambes: apparence.age ? '#4a4038' : undefined });
  if (apparence.age) modele.userData.parties.corps.rotation.x = 0.12;
  modele.scale.setScalar(apparence.taille || 1);
  return modele;
}

// Tableau des quêtes (objet du village).
export function creerTableau(couleurs) {
  const g = new THREE.Group();
  for (const x of [-0.9, 0.9]) {
    const poteau = boite(0.15, 2.2, 0.15, couleurs[0]);
    poteau.position.set(x, 1.1, 0);
    g.add(poteau);
  }
  const planche = boite(2, 1.2, 0.1, couleurs[0]);
  planche.position.y = 1.5;
  g.add(planche);
  for (const [x, y] of [[-0.5, 1.6], [0.1, 1.45], [0.55, 1.65], [-0.2, 1.25]]) {
    const affiche = boite(0.35, 0.42, 0.02, couleurs[1]);
    affiche.position.set(x, y, 0.06);
    affiche.rotation.z = (x * 7) % 0.2 - 0.1;
    g.add(affiche);
  }
  const toit = boite(2.3, 0.1, 0.5, '#7a3a2a');
  toit.position.y = 2.25;
  g.add(toit);
  g.userData.parties = null;
  g.userData.type = 'objet';
  return g;
}

// Monstres : quelques gabarits réutilisables, réglés par les données.
export function creerModeleMonstre(modele) {
  if (modele.forme === 'humanoide') {
    const m = creerHumanoide({ couleurs: modele.couleurs, cheveux: '#2a1a1a', arme: modele.arme, taille: modele.taille });
    return m;
  }
  const [c1, c2] = modele.couleurs;
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  racine.add(corps);
  let parties;

  if (modele.forme === 'quadrupede' || modele.forme === 'sanglier') {
    const sanglier = modele.forme === 'sanglier';
    corps.position.y = sanglier ? 0.6 : 0.75;
    const tronc = boite(sanglier ? 0.75 : 0.55, sanglier ? 0.65 : 0.5, sanglier ? 1.15 : 1.2, c1);
    corps.add(tronc);
    if (sanglier) {
      const crete = boite(0.2, 0.18, 0.9, c2);
      crete.position.set(0, 0.38, 0);
      corps.add(crete);
    }
    const tete = new THREE.Group();
    tete.position.set(0, sanglier ? 0.05 : 0.25, sanglier ? 0.68 : 0.65);
    const crane = boite(sanglier ? 0.5 : 0.42, sanglier ? 0.45 : 0.38, 0.45, c1);
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
    if (sanglier) {
      for (const x of [0.14, -0.14]) {
        const defense = boite(0.05, 0.22, 0.05, '#f2ead8');
        defense.position.set(x, 0.02, 0.42);
        defense.rotation.x = -0.5;
        tete.add(defense);
      }
    }
    corps.add(tete);
    const queue = boite(0.12, 0.12, sanglier ? 0.2 : 0.55, c2);
    queue.position.set(0, 0.15, sanglier ? -0.62 : -0.8);
    queue.rotation.x = 0.5;
    corps.add(queue);
    const pattes = [];
    const hauteurPatte = sanglier ? 0.45 : 0.55;
    for (const [x, z] of [[0.22, 0.4], [-0.22, 0.4], [0.22, -0.4], [-0.22, -0.4]]) {
      const patte = membre(0.15, hauteurPatte, 0.15, c2);
      patte.position.set(x, -0.15, z);
      corps.add(patte);
      pattes.push(patte);
    }
    parties = { corps, tete, pattes, queue };
    racine.userData.type = 'quadrupede';
    racine.userData.hauteurCorps = corps.position.y;
  } else if (modele.forme === 'insecte') {
    // Frelon : corps rayé, ailes qui battent, dard.
    corps.position.y = 0;
    const thorax = sphere(0.32, c2, 0);
    const abdomen = new THREE.Group();
    abdomen.position.z = -0.45;
    for (let k = 0; k < 3; k++) {
      const anneau = sphere(0.3 - k * 0.05, k % 2 ? c2 : c1, 0);
      anneau.position.z = -k * 0.22;
      abdomen.add(anneau);
    }
    const dard = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 5), materiau('#1a1a1a'));
    dard.rotation.x = -Math.PI / 2;
    dard.position.z = -0.85;
    abdomen.add(dard);
    abdomen.rotation.x = 0.35;
    const tete = sphere(0.22, c2, 0);
    tete.position.z = 0.35;
    const oeilG = sphere(0.09, '#ff3a2a', 0);
    oeilG.material = materiau('#ff3a2a', { emissive: '#ff2000', emissiveIntensity: 0.8 });
    oeilG.position.set(0.12, 0.05, 0.5);
    const oeilD = oeilG.clone();
    oeilD.position.x = -0.12;
    const ailes = [];
    for (const sens of [1, -1]) {
      const aile = new THREE.Group();
      const membrane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.35),
        materiauToon({ color: '#e8f4ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
      );
      membrane.position.x = sens * 0.45;
      membrane.rotation.x = -Math.PI / 2;
      aile.add(membrane);
      aile.position.set(sens * 0.15, 0.25, 0);
      corps.add(aile);
      ailes.push(aile);
    }
    corps.add(thorax, abdomen, tete, oeilG, oeilD);
    parties = { corps, ailes, abdomen };
    racine.userData.type = 'insecte';
  } else {
    // humanoide_trapu (gobelins)
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
    if (modele.couronne) {
      const couronne = new THREE.Group();
      const bandeau = cylindre(0.27, 0.27, 0.1, '#d4af37', 8);
      couronne.add(bandeau);
      for (let k = 0; k < 5; k++) {
        const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), materiau('#d4af37', { emissive: '#8a6a10', emissiveIntensity: 0.4 }));
        const a = (k / 5) * Math.PI * 2;
        pointe.position.set(Math.cos(a) * 0.24, 0.12, Math.sin(a) * 0.24);
        couronne.add(pointe);
      }
      couronne.position.y = 0.25;
      tete.add(couronne);
    }
    corps.add(tete);
    const brasG = membre(0.16, 0.55, 0.16, c1);
    brasG.position.set(0.4, 0.5, 0);
    const brasD = membre(0.16, 0.55, 0.16, c1);
    brasD.position.set(-0.4, 0.5, 0);
    corps.add(brasG, brasD);
    const main = new THREE.Group();
    main.position.y = -0.55;
    brasD.add(main);
    const arme = modele.arme === 'masse' ? creerArme('masse', ['#7a5a3a', '#4a3a2a'])
      : modele.arme === 'baton' ? creerArme('baton', ['#7fff7a', '#4a3a2a'])
        : creerArme('epee', ['#7a5a3a', '#4a3a2a']);
    arme.scale.setScalar(0.8);
    arme.rotation.x = Math.PI / 2;
    main.add(arme);
    const jambeG = membre(0.2, 0.75, 0.2, c2);
    jambeG.position.set(0.15, 0, 0);
    const jambeD = membre(0.2, 0.75, 0.2, c2);
    jambeD.position.set(-0.15, 0, 0);
    corps.add(jambeG, jambeD);
    parties = { corps, torse, tete, brasG, brasD, jambeG, jambeD };
    racine.userData.type = 'humanoide';
    racine.userData.hauteurCorps = 0.75;
  }
  racine.scale.setScalar(modele.taille || 1);
  racine.userData.parties = parties;
  return racine;
}
