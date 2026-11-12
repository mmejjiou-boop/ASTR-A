// Intelligence des monstres : patrouille, repérage, poursuite, attaques annoncées
// (corps à corps, zones, charges, tirs), retour au point d'apparition.
// Boss : phases selon la vie restante, invocations, pas d'abandon.
import * as THREE from 'three';
import { estEtourdi, facteurVitesse, mettreAJourEffets, appliquerEffet } from './effets.js';
import { toucherHeros } from './combat.js';
import { emettre } from '../core/evenements.js';

function angleVers(depuis, vers, facteur) {
  let ecart = vers - depuis;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
  return depuis + ecart * Math.min(1, facteur);
}

function avancer(monstre, cibleX, cibleZ, vitesse, dt, collisions, recule = false) {
  const dx = cibleX - monstre.position.x;
  const dz = cibleZ - monstre.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return distance;
  const sens = recule ? -1 : 1;
  const pas = Math.min(distance, vitesse * dt);
  monstre.position.x += (dx / distance) * pas * sens;
  monstre.position.z += (dz / distance) * pas * sens;
  monstre.orientation = angleVers(monstre.orientation, Math.atan2(dx, dz), dt * 8);
  monstre.vitesseActuelle = vitesse;
  collisions.resoudre(monstre.position, monstre.rayon);
  return distance;
}

// Attaques disponibles (celles de la phase en cours pour un boss).
function attaquesDe(monstre) {
  return monstre.def.phases ? monstre.def.phases[monstre.phase].attaques : monstre.def.attaques;
}

export function mettreAJourMonstre(monstre, dt, monde) {
  const { heros, collisions } = monde;
  const comportement = monstre.def.comportement;
  monstre.vitesseActuelle = 0;

  mettreAJourEffets(monstre, dt, (montant, idEffet) => {
    if (monstre.mort) return;
    monstre.recevoirDegats(montant, monde);
    emettre('degats', { position: monstre.positionTete(), montant, critique: false, cible: 'monstre', effet: idEffet });
  });
  if (monstre.mort) return;
  for (const [id, temps] of monstre.recharges) monstre.recharges.set(id, temps - dt);

  // Boss : changement de phase quand la vie passe sous un seuil.
  if (monstre.def.phases) {
    const suivante = monstre.def.phases[monstre.phase + 1];
    if (suivante && monstre.vie / monstre.stats.vieMax <= suivante.seuilVie) {
      monstre.phase++;
      if (suivante.message) emettre('message', { cle: suivante.message, grand: true });
      if (suivante.invocation) monde.invoquer(monstre, suivante.invocation.monstre, suivante.invocation.nombre);
      monde.visuels.anneau(monstre.position, 8, 0xff3a1a, 0.6);
    }
  }
  // Invocations régulières (reine des frelons).
  if (monstre.def.invocation && monstre.etat === 'poursuite') {
    monstre.chronoInvocation = (monstre.chronoInvocation ?? monstre.def.invocation.recharge * 0.5) - dt;
    if (monstre.chronoInvocation <= 0) {
      monstre.chronoInvocation = monstre.def.invocation.recharge;
      monde.invoquer(monstre, monstre.def.invocation.monstre, monstre.def.invocation.nombre);
    }
  }

  const dx = heros.position.x - monstre.position.x;
  const dz = heros.position.z - monstre.position.z;
  const distanceHeros = Math.hypot(dx, dz);
  const distanceSpawn = Math.hypot(monstre.position.x - monstre.spawn.x, monstre.position.z - monstre.spawn.z);

  // Attaque en cours d'annonce : le monstre ne bouge plus, puis frappe.
  if (monstre.attaqueEnCours) {
    const a = monstre.attaqueEnCours;
    if (estEtourdi(monstre)) {
      a.telegraphe.retirer();
      monstre.attaqueEnCours = null;
    } else {
      a.temps += dt;
      const t = Math.min(1, a.temps / a.def.annonce);
      if (a.def.forme === 'projectile') {
        // Le tireur suit sa cible des yeux pendant qu'il vise.
        monstre.orientation = Math.atan2(dx, dz);
        a.telegraphe.placer(monstre.position, monstre.orientation, poserSol(monstre, collisions));
      }
      a.telegraphe.progression(t);
      monstre.animAttaque = t * 0.4;
      if (t >= 1) {
        resoudreAttaque(monstre, a, monde);
        a.telegraphe.retirer();
        monstre.attaqueEnCours = null;
        monstre.animAttaque = 0.4;
        monstre.recharges.set(a.def.id, a.def.recharge);
      }
      placerHauteur(monstre, collisions, monde.temps);
      return;
    }
  }
  if (monstre.animAttaque >= 0.4) {
    monstre.animAttaque += dt * 2.5;
    if (monstre.animAttaque > 1) monstre.animAttaque = -1;
  }

  if (estEtourdi(monstre)) {
    placerHauteur(monstre, collisions, monde.temps);
    return;
  }
  const vitesseMax = comportement.vitesse * facteurVitesse(monstre);

  // Changements d'état.
  if (heros.mort) {
    if (monstre.etat === 'poursuite') monstre.etat = 'retour';
  } else if (monstre.etat === 'patrouille' && distanceHeros < comportement.vision && !monstre.endormi) {
    monde.alerter(monstre);
  } else if (monstre.etat === 'poursuite' && distanceSpawn > comportement.abandon) {
    monstre.etat = 'retour';
  }

  if (monstre.etat === 'poursuite') {
    const attaques = attaquesDe(monstre);
    const attaque = attaques
      .filter((a) => (monstre.recharges.get(a.id) || 0) <= 0 && distanceHeros <= a.portee + 0.3)
      .sort((a, b) => b.coefficient - a.coefficient)[0];
    if (attaque && !monde.limiteAttaquants(monstre)) {
      lancerAttaque(monstre, attaque, monde, dx, dz);
    } else if (comportement.distancePreferee) {
      // Tireur : garde ses distances.
      if (distanceHeros > comportement.distancePreferee + 3) avancer(monstre, heros.position.x, heros.position.z, vitesseMax, dt, collisions);
      else if (distanceHeros < comportement.distancePreferee - 4) avancer(monstre, heros.position.x, heros.position.z, vitesseMax * 0.7, dt, collisions, true);
      else monstre.orientation = angleVers(monstre.orientation, Math.atan2(dx, dz), dt * 8);
    } else {
      const portee = Math.min(...attaques.map((a) => a.portee));
      if (distanceHeros > portee * 0.8) avancer(monstre, heros.position.x, heros.position.z, vitesseMax, dt, collisions);
      else monstre.orientation = angleVers(monstre.orientation, Math.atan2(dx, dz), dt * 8);
    }
  } else if (monstre.etat === 'retour') {
    const d = avancer(monstre, monstre.spawn.x, monstre.spawn.z, vitesseMax, dt, collisions);
    // En rentrant, le monstre se soigne.
    monstre.vie = Math.min(monstre.stats.vieMax, monstre.vie + monstre.stats.vieMax * 0.3 * dt);
    if (d < 1.5) {
      monstre.etat = 'patrouille';
      monstre.vie = monstre.stats.vieMax;
      monstre.effets = [];
    }
  } else if (comportement.patrouille > 0) {
    // Patrouille : se promène autour de son point d'apparition.
    if (monstre.pause > 0) {
      monstre.pause -= dt;
    } else {
      if (!monstre.pointPatrouille) {
        const angle = Math.random() * Math.PI * 2;
        const rayon = Math.random() * comportement.patrouille;
        monstre.pointPatrouille = { x: monstre.spawn.x + Math.cos(angle) * rayon, z: monstre.spawn.z + Math.sin(angle) * rayon };
      }
      const d = avancer(monstre, monstre.pointPatrouille.x, monstre.pointPatrouille.z, comportement.vitessePatrouille, dt, collisions);
      if (d < 0.5) {
        monstre.pointPatrouille = null;
        monstre.pause = 1.5 + Math.random() * 3;
      }
    }
  }
  placerHauteur(monstre, collisions, monde.temps);
}

function poserSol(monstre, collisions) {
  return collisions.hauteur(monstre.position.x, monstre.position.z);
}

function placerHauteur(monstre, collisions, temps) {
  const sol = poserSol(monstre, collisions);
  // Les volants planent au-dessus du sol.
  monstre.position.y = monstre.def.volant ? sol + 1.5 + Math.sin(temps * 2 + monstre.uid) * 0.25 : sol;
}

function lancerAttaque(monstre, attaque, monde, dx, dz) {
  monstre.orientation = Math.atan2(dx, dz);
  const forme = attaque.forme || 'cone';
  const telegraphe = forme === 'projectile'
    ? monde.visuels.telegraphe('ligne', Math.min(attaque.portee, Math.hypot(dx, dz) + 2))
    : monde.visuels.telegraphe(forme, attaque.portee + 0.4, Math.PI / 1.8);
  telegraphe.placer(monstre.position, monstre.orientation, poserSol(monstre, monde.collisions));
  monstre.attaqueEnCours = { def: attaque, temps: 0, telegraphe };
}

// Le héros est-il dans la zone annoncée au moment où le coup part ?
function resoudreAttaque(monstre, a, monde) {
  const heros = monde.heros;
  const forme = a.def.forme || 'cone';
  const ox = Math.sin(monstre.orientation), oz = Math.cos(monstre.orientation);
  const dx = heros.position.x - monstre.position.x;
  const dz = heros.position.z - monstre.position.z;
  const portee = a.def.portee + 0.4 + heros.rayon;
  let touche = false;

  if (forme === 'projectile') {
    tirer(monstre, a.def, monde);
    return;
  }
  if (forme === 'ligne') {
    // Charge ou bond : le monstre se projette vers l'avant.
    const avant = dx * ox + dz * oz;
    const cote = Math.abs(-dx * oz + dz * ox);
    touche = avant > -0.5 && avant < portee && cote < 0.9 + heros.rayon;
    const saut = touche ? Math.max(0, avant - 1.2) : a.def.portee;
    monstre.position.x += ox * saut;
    monstre.position.z += oz * saut;
    monde.collisions.resoudre(monstre.position, monstre.rayon);
  } else if (forme === 'cercle') {
    touche = Math.hypot(dx, dz) < portee;
    monde.visuels.anneau(monstre.position, portee, 0xff6a3a, 0.35);
  } else {
    const distance = Math.hypot(dx, dz);
    const face = distance > 0 ? (dx * ox + dz * oz) / distance : 1;
    touche = distance < portee && face > Math.cos(Math.PI / 3.6);
  }
  if (touche && Math.abs(heros.position.y - monstre.position.y) < 3) {
    const avant = heros.vie;
    toucherHeros(monde, monstre, a.def);
    if (heros.vie < avant) for (const e of a.def.effets || []) appliquerEffet(heros, e, monstre.stats.attaque);
  }
}

// Tir d'un monstre (flèche, boule de feu) vers la position actuelle du héros.
function tirer(monstre, attaque, monde) {
  const depart = new THREE.Vector3(monstre.position.x, monstre.position.y + monstre.hauteur * 0.7, monstre.position.z);
  const cible = monde.heros.position.clone().setY(monde.heros.position.y + 1.1);
  const vitesse = cible.sub(depart).normalize().multiplyScalar(attaque.vitesse || 20);
  const couleur = attaque.id.includes('feu') ? '#7fff4a' : '#e8dcc0';
  const maillage = monde.visuels.creerProjectile(couleur, attaque.id.includes('fleche') ? 'fleche' : 'orbe');
  maillage.position.copy(depart);
  if (!attaque.id.includes('fleche')) maillage.scale.setScalar(0.7);
  monde.projectilesMonstres.push({ maillage, vitesse, parcouru: 0, portee: attaque.portee * 1.5, monstre, attaque });
}

export function mettreAJourProjectilesMonstres(monde, dt) {
  const heros = monde.heros;
  for (let i = monde.projectilesMonstres.length - 1; i >= 0; i--) {
    const p = monde.projectilesMonstres[i];
    const pas = p.vitesse.clone().multiplyScalar(dt);
    p.maillage.position.add(pas);
    p.maillage.lookAt(p.maillage.position.clone().add(p.vitesse));
    p.parcouru += pas.length();
    const pos = p.maillage.position;
    const touche = !heros.mort && Math.hypot(pos.x - heros.position.x, pos.z - heros.position.z) < 0.75
      && pos.y > heros.position.y - 0.2 && pos.y < heros.position.y + 2.2;
    const bloque = pos.y < monde.collisions.hauteur(pos.x, pos.z) || monde.collisions.estBloque(pos.x, pos.y, pos.z);
    if (touche) {
      const avant = heros.vie;
      toucherHeros(monde, p.monstre, p.attaque);
      if (heros.vie < avant) for (const e of p.attaque.effets || []) appliquerEffet(heros, e, p.monstre.stats.attaque);
    }
    if (touche || bloque || p.parcouru > p.portee) {
      monde.visuels.eclat(pos.clone(), '#ffffff', 5);
      monde.visuels.retirer(p.maillage);
      monde.projectilesMonstres.splice(i, 1);
    }
  }
}
