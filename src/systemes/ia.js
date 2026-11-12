// Intelligence des monstres : patrouille, repérage, poursuite, attaques annoncées, retour.
import { estEtourdi, facteurVitesse, mettreAJourEffets } from './effets.js';
import { toucherHeros } from './combat.js';
import { emettre } from '../core/evenements.js';

function angleVers(depuis, vers, facteur) {
  let ecart = vers - depuis;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
  return depuis + ecart * Math.min(1, facteur);
}

function avancer(monstre, cibleX, cibleZ, vitesse, dt, collisions) {
  const dx = cibleX - monstre.position.x;
  const dz = cibleZ - monstre.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.05) return distance;
  const pas = Math.min(distance, vitesse * dt);
  monstre.position.x += (dx / distance) * pas;
  monstre.position.z += (dz / distance) * pas;
  monstre.orientation = angleVers(monstre.orientation, Math.atan2(dx, dz), dt * 8);
  monstre.vitesseActuelle = vitesse;
  collisions.resoudre(monstre.position, monstre.rayon);
  return distance;
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
      a.telegraphe.progression(t);
      monstre.animAttaque = t * 0.4;
      if (t >= 1) {
        resoudreAttaque(monstre, a, monde);
        a.telegraphe.retirer();
        monstre.attaqueEnCours = null;
        monstre.animAttaque = 0.4;
        monstre.recharges.set(a.def.id, a.def.recharge);
      }
      poserAuSol(monstre, collisions);
      return;
    }
  }
  if (monstre.animAttaque >= 0.4) {
    monstre.animAttaque += dt * 2.5;
    if (monstre.animAttaque > 1) monstre.animAttaque = -1;
  }

  if (estEtourdi(monstre)) {
    poserAuSol(monstre, collisions);
    return;
  }
  const vitesseMax = comportement.vitesse * facteurVitesse(monstre);

  // Changements d'état.
  if (heros.mort) {
    if (monstre.etat === 'poursuite') monstre.etat = 'retour';
  } else if (monstre.etat === 'patrouille' && distanceHeros < comportement.vision) {
    monde.alerter(monstre);
  } else if (monstre.etat === 'poursuite' && distanceSpawn > comportement.abandon) {
    monstre.etat = 'retour';
  }

  if (monstre.etat === 'poursuite') {
    // Choisit une attaque prête dont la portée atteint le héros.
    const attaque = monstre.def.attaques
      .filter((a) => (monstre.recharges.get(a.id) || 0) <= 0 && distanceHeros <= a.portee + 0.3)
      .sort((a, b) => b.coefficient - a.coefficient)[0];
    if (attaque && !monde.limiteAttaquants(monstre)) {
      lancerAttaque(monstre, attaque, monde, dx, dz);
    } else {
      const portee = Math.min(...monstre.def.attaques.map((a) => a.portee));
      if (distanceHeros > portee * 0.8) {
        avancer(monstre, heros.position.x, heros.position.z, vitesseMax, dt, collisions);
      } else {
        monstre.orientation = angleVers(monstre.orientation, Math.atan2(dx, dz), dt * 8);
      }
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
  } else {
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
  poserAuSol(monstre, collisions);
}

function poserAuSol(monstre, collisions) {
  monstre.position.y = collisions.hauteur(monstre.position.x, monstre.position.z);
}

function lancerAttaque(monstre, attaque, monde, dx, dz) {
  monstre.orientation = Math.atan2(dx, dz);
  const telegraphe = monde.visuels.telegraphe(attaque.forme || 'cone', attaque.portee + 0.4, Math.PI / 1.8);
  telegraphe.placer(monstre.position, monstre.orientation, monstre.position.y);
  monstre.attaqueEnCours = { def: attaque, temps: 0, telegraphe };
}

// Le héros est-il dans la zone annoncée au moment où le coup part ?
function resoudreAttaque(monstre, a, monde) {
  const heros = monde.heros;
  const forme = a.def.forme || 'cone';
  const ox = Math.sin(monstre.orientation), oz = Math.cos(monstre.orientation);
  let dx = heros.position.x - monstre.position.x;
  let dz = heros.position.z - monstre.position.z;
  const portee = a.def.portee + 0.4 + heros.rayon;
  let touche = false;

  if (forme === 'ligne') {
    // Bond : le monstre se projette vers l'avant.
    const avant = dx * ox + dz * oz;
    const cote = Math.abs(-dx * oz + dz * ox);
    touche = avant > -0.5 && avant < portee && cote < 0.7 + heros.rayon;
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
  if (touche && Math.abs(heros.position.y - monstre.position.y) < 2.5) toucherHeros(monde, monstre, a.def);
}
