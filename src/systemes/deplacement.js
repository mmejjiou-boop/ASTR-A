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

// tour : tour d'observation du monde (escalade), niveauEau : hauteur de l'eau (on avance moins vite dedans).
export function deplacerHeros(heros, dt, entrees, camera, collisions, config, cible, tour = null, niveauEau = -Infinity) {
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

  // Escalade de la tour : on s'accroche en marchant contre sa paroi.
  if (tour && !heros.escalade && !heros.mort && bouge && !heros.roulade && !heros.ruee && !heros.epuise && heros.endurance > 5) {
    const dx = tour.x - heros.position.x, dz = tour.z - heros.position.z;
    const d = Math.hypot(dx, dz);
    const sommet = tour.base + tour.hauteur;
    if (d < tour.rayon + heros.rayon + 0.4 && heros.position.y < sommet - 0.5 && (direction.x * dx + direction.z * dz) / d > 0.55) {
      heros.escalade = { angle: Math.atan2(heros.position.x - tour.x, heros.position.z - tour.z), mouvement: 0 };
      heros.vitesse.set(0, 0, 0);
      heros.vitesseY = 0;
      heros.attaque = null;
    }
  }
  if (heros.escalade) return escalader(heros, dt, entrees, collisions, config, tour);

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

  // Dans l'eau d'une rivière, on avance moins vite.
  if (heros.position.y < niveauEau - 0.3) {
    heros.position.x = avant.x + (heros.position.x - avant.x) * 0.55;
    heros.position.z = avant.z + (heros.position.z - avant.z) * 0.55;
  }

  // Pente trop raide : on ne monte pas en marchant (seules les tours et parois marquées s'escaladent).
  const surPlateforme = heros.position.y > collisions.hauteur(heros.position.x, heros.position.z) + 0.3;
  if (heros.auSol && !surPlateforme) {
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
  const sol = collisions.hauteurSol(heros.position.x, heros.position.z, heros.position.y);
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

// Escalade : Z/W monte, S descend, Q/D tourne autour de la tour, Espace saute en arrière.
// L'endurance baisse ; à zéro, le héros lâche prise. Les paliers permettent de souffler.
function escalader(heros, dt, entrees, collisions, config, tour) {
  const e = heros.escalade;
  const reglages = config.escalade;
  const haut = entrees.appuye('KeyW') ? 1 : entrees.appuye('KeyS') ? -1 : 0;
  const cote = entrees.appuye('KeyD') ? 1 : entrees.appuye('KeyA') ? -1 : 0;
  const rayon = tour.rayon + 0.55;
  e.mouvement = haut || cote ? (e.mouvement || 0) + dt * 6 : e.mouvement;

  heros.endurance -= reglages.coutParSeconde * (haut || cote ? 1 : 0.25) * dt;
  heros.delaiEndurance = config.deplacement.delaiRecuperation;
  const lacher = () => {
    heros.escalade = null;
    heros.position.x = tour.x + Math.sin(e.angle) * (rayon + 0.6);
    heros.position.z = tour.z + Math.cos(e.angle) * (rayon + 0.6);
    heros.auSol = false;
  };

  if (heros.endurance <= 0) {
    heros.endurance = 0;
    heros.epuise = true;
    emettre('message', { cle: 'msg.escalade' });
    lacher();
    return 0;
  }
  if (entrees.vientDAppuyer('Space')) {
    heros.endurance = Math.max(0, heros.endurance - reglages.coutSaut);
    lacher();
    heros.vitesseY = 4;
    heros.vitesse.set(Math.sin(e.angle) * 4, 0, Math.cos(e.angle) * 4);
    return 0;
  }

  e.angle -= (cote * reglages.vitesse * 0.8 * dt) / rayon;
  heros.position.y += haut * reglages.vitesse * dt;
  heros.position.x = tour.x + Math.sin(e.angle) * rayon;
  heros.position.z = tour.z + Math.cos(e.angle) * rayon;
  heros.orientation = e.angle + Math.PI;
  heros.vitesse.set(0, 0, 0);
  heros.vitesseY = 0;

  // Arrivée à un palier ou au sommet : on se hisse dessus.
  const niveaux = [...tour.paliers.map((h) => tour.base + h), tour.base + tour.hauteur];
  for (const h of niveaux) {
    if (haut > 0 && heros.position.y >= h - 0.05 && heros.position.y - haut * reglages.vitesse * dt < h) {
      heros.escalade = null;
      heros.position.y = h;
      const sortie = h === tour.base + tour.hauteur ? tour.rayon - 1.5 : tour.rayon + 1.4;
      heros.position.x = tour.x + Math.sin(e.angle) * sortie;
      heros.position.z = tour.z + Math.cos(e.angle) * sortie;
      heros.auSol = true;
      return 0;
    }
  }
  // Redescendu jusqu'au sol.
  const sol = collisions.hauteurSol(heros.position.x, heros.position.z, heros.position.y);
  if (heros.position.y <= sol) {
    heros.position.y = sol;
    lacher();
    heros.auSol = true;
  }
  return 0;
}
