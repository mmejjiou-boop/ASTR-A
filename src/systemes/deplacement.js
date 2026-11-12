// Déplacements du héros : marcher, courir (endurance), sauter, roulade d'esquive.
import * as THREE from 'three';
import { estEtourdi, facteurVitesse } from './effets.js';
import { emettre } from '../core/evenements.js';

const direction = new THREE.Vector3();
const voulue = new THREE.Vector3();

function angleVers(depuis, vers, facteur) {
  let ecart = vers - depuis;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
  return depuis + ecart * Math.min(1, facteur);
}

export function deplacerHeros(heros, dt, entrees, camera, collisions, config, cible) {
  const reglages = config.deplacement;
  const avant = heros.position.clone();
  const etourdi = estEtourdi(heros);

  // Direction demandée au clavier, relative à la caméra.
  direction.set(0, 0, 0);
  if (!heros.mort && !etourdi) {
    const av = camera.avant();
    const dr = camera.droite();
    if (entrees.appuye('KeyW')) direction.add(av);
    if (entrees.appuye('KeyS')) direction.sub(av);
    if (entrees.appuye('KeyD')) direction.add(dr);
    if (entrees.appuye('KeyA')) direction.sub(dr);
  }
  const bouge = direction.lengthSq() > 0;
  if (bouge) direction.normalize();

  // Blocage (clic droit) : seulement au sol et sans autre action.
  heros.bloque = !heros.mort && !etourdi && entrees.souris.droite && heros.auSol && !heros.roulade && !heros.ruee && !heros.epuise;

  // Roulade d'esquive.
  if (!heros.mort && !etourdi && entrees.vientDAppuyer('KeyC') && heros.auSol && !heros.roulade && !heros.ruee) {
    if (heros.endurance >= reglages.coutRoulade && !heros.epuise) {
      heros.endurance -= reglages.coutRoulade;
      heros.delaiEndurance = reglages.delaiRecuperation;
      const sens = bouge ? direction.clone() : new THREE.Vector3(Math.sin(heros.orientation), 0, Math.cos(heros.orientation));
      heros.roulade = { temps: 0, direction: sens };
      heros.orientation = Math.atan2(sens.x, sens.z);
      heros.attaque = null;
    } else {
      emettre('message', { cle: 'msg.endurance' });
    }
  }

  let court = false;
  if (heros.roulade) {
    const r = reglages.roulade;
    heros.roulade.temps += dt;
    voulue.copy(heros.roulade.direction).multiplyScalar(r.distance / r.duree);
    heros.vitesse.copy(voulue);
    if (heros.roulade.temps >= r.duree) heros.roulade = null;
  } else if (heros.ruee) {
    // Ruée d'une compétence (charge, pas de l'ombre) : gérée ici pour les collisions.
    const ru = heros.ruee;
    heros.vitesse.copy(ru.direction).multiplyScalar(ru.distance / ru.duree);
  } else {
    court = bouge && entrees.appuye('ShiftLeft') && !heros.epuise && !heros.bloque && heros.endurance > 0;
    let vitesse = heros.bloque ? reglages.vitesseBlocage : court ? reglages.course : reglages.marche;
    vitesse *= facteurVitesse(heros);
    if (heros.attaque && heros.auSol) vitesse *= 0.35;
    voulue.copy(direction).multiplyScalar(bouge ? vitesse : 0);
    // Accélération progressive : le héros a du poids.
    const reactivite = heros.auSol ? 14 : 3;
    heros.vitesse.lerp(voulue, Math.min(1, dt * reactivite));
  }

  // Saut.
  if (!heros.mort && !etourdi && entrees.vientDAppuyer('Space') && heros.auSol && !heros.roulade && !heros.ruee && !heros.bloque) {
    heros.vitesseY = reglages.saut;
    heros.auSol = false;
  }

  // Endurance : la course la consomme, elle revient après un court délai.
  if (court) {
    heros.endurance -= reglages.coutCourseParSeconde * dt;
    heros.delaiEndurance = reglages.delaiRecuperation;
  } else if (heros.delaiEndurance > 0) {
    heros.delaiEndurance -= dt;
  } else {
    heros.endurance += reglages.recuperationParSeconde * dt;
  }
  if (heros.endurance <= 0) {
    heros.endurance = 0;
    heros.epuise = true;
  }
  if (heros.epuise && heros.endurance >= reglages.enduranceMax * 0.3) heros.epuise = false;
  heros.endurance = Math.min(reglages.enduranceMax, heros.endurance);

  // Mouvement horizontal, puis collisions.
  heros.position.x += heros.vitesse.x * dt;
  heros.position.z += heros.vitesse.z * dt;

  // Pente trop raide : on ne monte pas en marchant (l'escalade viendra à l'étape 2).
  if (heros.auSol) {
    const hAvant = collisions.hauteur(avant.x, avant.z);
    const hApres = collisions.hauteur(heros.position.x, heros.position.z);
    const distance = Math.hypot(heros.position.x - avant.x, heros.position.z - avant.z);
    if (distance > 0 && (hApres - hAvant) / distance > 1.4) {
      heros.position.x = avant.x;
      heros.position.z = avant.z;
    }
  }
  collisions.resoudre(heros.position, heros.rayon);

  // Gravité et sol.
  heros.vitesseY -= reglages.gravite * dt;
  heros.position.y += heros.vitesseY * dt;
  const sol = collisions.hauteur(heros.position.x, heros.position.z);
  if (heros.position.y <= sol) {
    heros.position.y = sol;
    heros.vitesseY = 0;
    heros.auSol = true;
  } else if (heros.auSol && heros.position.y - sol < 0.35 && heros.vitesseY <= 0) {
    // Colle au sol dans les descentes au lieu de « décoller ».
    heros.position.y = sol;
    heros.vitesseY = 0;
  } else {
    heros.auSol = false;
  }

  // Orientation : face à la cible verrouillée, sinon dans le sens de la marche.
  if (!heros.roulade && !heros.ruee && !heros.mort) {
    if (cible && (heros.bloque || heros.attaque || !court)) {
      heros.orientation = angleVers(heros.orientation, Math.atan2(cible.x - heros.position.x, cible.z - heros.position.z), dt * 12);
    } else if (heros.vitesse.lengthSq() > 0.5) {
      heros.orientation = angleVers(heros.orientation, Math.atan2(heros.vitesse.x, heros.vitesse.z), dt * 12);
    }
  }
  return heros.vitesse.length();
}
