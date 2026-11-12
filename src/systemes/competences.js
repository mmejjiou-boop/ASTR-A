// Attaques et compétences du héros. Chaque « forme » (melee, projectile, zone,
// ruee, soin, bouclier) est codée une seule fois et sert à toutes les classes.
import * as THREE from 'three';
import { attaqueHeros } from './stats.js';
import { toucherMonstre } from './combat.js';
import { estEtourdi } from './effets.js';
import { emettre } from '../core/evenements.js';

const HAUTEUR_TIR = 1.3;

// Direction de l'action : vers la cible verrouillée, sinon une cible proche
// de l'axe de la caméra (aide à la visée), sinon droit devant la caméra.
function directionAction(monde, portee) {
  const { heros, cible, camera } = monde;
  if (cible && !cible.mort) {
    return { direction: new THREE.Vector3(cible.position.x - heros.position.x, 0, cible.position.z - heros.position.z).normalize(), cible };
  }
  const avant = camera.avant();
  let meilleure = null, meilleurScore = Infinity;
  for (const m of monde.monstres) {
    if (m.mort) continue;
    const dx = m.position.x - heros.position.x, dz = m.position.z - heros.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > portee || distance < 0.01) continue;
    const alignement = (dx * avant.x + dz * avant.z) / distance;
    if (alignement < Math.cos(0.3)) continue;
    const score = distance * (2 - alignement);
    if (score < meilleurScore) { meilleurScore = score; meilleure = m; }
  }
  if (meilleure) {
    return {
      direction: new THREE.Vector3(meilleure.position.x - heros.position.x, 0, meilleure.position.z - heros.position.z).normalize(),
      cible: meilleure,
    };
  }
  return { direction: avant, cible: null };
}

function coupDe(monde, def) {
  const { heros } = monde;
  const { config } = monde.donnees;
  return {
    attaque: attaqueHeros(config, heros.stats, def.statUtilisee),
    coefficient: def.coefficient,
    critique: Math.min(config.degats.critiqueMax, heros.stats.critique + (def.bonusCritique || 0)),
    effets: def.effets || [],
    volVie: def.volVie || 0,
  };
}

// Utilise l'attaque de base (def = classe.attaqueBase) ou une compétence.
export function utiliser(monde, def, estCompetence) {
  const { heros } = monde;
  if (heros.mort || heros.roulade || heros.ruee || estEtourdi(heros)) return false;
  if (heros.attaque && heros.attaque.temps < heros.attaque.duree * 0.8) return false;
  const cleRecharge = estCompetence ? def.id : '__base';
  if ((heros.recharges.get(cleRecharge) || 0) > 0) {
    if (estCompetence) emettre('message', { cle: 'msg.recharge' });
    return false;
  }
  if (estCompetence) {
    if ((def.coutMana || 0) > heros.mana) {
      emettre('message', { cle: 'msg.mana' });
      return false;
    }
    heros.mana -= def.coutMana || 0;
    if (def.coutVie) heros.vie = Math.max(1, heros.vie - heros.stats.vieMax * def.coutVie);
  }
  heros.recharges.set(cleRecharge, def.recharge);

  const forme = def.forme;
  const { direction } = directionAction(monde, forme.portee || forme.distance || 30);
  if (forme.type !== 'soin' && forme.type !== 'bouclier') heros.orientation = Math.atan2(direction.x, direction.z);
  const coup = coupDe(monde, def);
  const couleur = def.visuel?.couleur || '#ffffff';

  switch (forme.type) {
    case 'melee': {
      heros.attaque = { temps: 0, duree: 0.42, incantation: false };
      monde.planifier(0.15, () => frapperArc(monde, forme, coup, couleur));
      break;
    }
    case 'projectile': {
      heros.attaque = { temps: 0, duree: 0.38, incantation: true };
      monde.planifier(0.14, () => lancerProjectile(monde, forme, coup, couleur));
      break;
    }
    case 'zone': {
      heros.attaque = { temps: 0, duree: 0.45, incantation: forme.centre !== 'soi' };
      monde.planifier(0.12, () => frapperZone(monde, forme, coup, couleur, direction));
      break;
    }
    case 'ruee': {
      heros.ruee = {
        temps: 0,
        duree: forme.distance / 24,
        direction: direction.clone(),
        distance: forme.distance,
        largeur: forme.largeur || 1.5,
        coup,
        couleur,
        touches: new Set(),
      };
      break;
    }
    case 'soin': {
      heros.attaque = { temps: 0, duree: 0.5, incantation: true };
      const soin = heros.soigner(Math.round(heros.stats.vieMax * forme.part));
      monde.visuels.colonne(heros.position, couleur);
      emettre('soin', { position: heros.positionTete(), montant: soin });
      break;
    }
    case 'bouclier': {
      heros.attaque = { temps: 0, duree: 0.5, incantation: true };
      heros.bouclierAbsorbe = Math.round(heros.stats.vieMax * forme.part);
      heros.bouclierRestant = forme.duree;
      monde.visuels.anneau(heros.position, 2.5, couleur, 0.5);
      break;
    }
    default:
      console.warn(`Forme de compétence inconnue : ${forme.type}`);
  }
  return true;
}

function frapperArc(monde, forme, coup, couleur) {
  const { heros } = monde;
  if (heros.mort) return;
  const angle = (forme.angle || 100) * Math.PI / 180;
  monde.visuels.arc(heros.position, heros.orientation, forme.portee, angle, couleur);
  const ox = Math.sin(heros.orientation), oz = Math.cos(heros.orientation);
  for (const m of monde.monstres) {
    if (m.mort) continue;
    const dx = m.position.x - heros.position.x, dz = m.position.z - heros.position.z;
    const distance = Math.hypot(dx, dz) - m.rayon;
    if (distance > forme.portee) continue;
    const face = (dx * ox + dz * oz) / Math.max(0.01, Math.hypot(dx, dz));
    if (face < Math.cos(angle / 2) && distance > 0.6) continue;
    if (Math.abs(m.position.y - heros.position.y) > 2.5) continue;
    toucherMonstre(monde, m, coup);
    monde.visuels.eclat(m.centre(), couleur, 6);
  }
}

function frapperZone(monde, forme, coup, couleur, direction) {
  const { heros, cible } = monde;
  if (heros.mort) return;
  const centre = heros.position.clone();
  if (forme.centre === 'devant') {
    const distance = cible && !cible.mort
      ? Math.min(forme.distance, Math.hypot(cible.position.x - heros.position.x, cible.position.z - heros.position.z))
      : forme.distance;
    centre.addScaledVector(direction, distance);
    centre.y = monde.collisions.hauteur(centre.x, centre.z);
  }
  monde.visuels.anneau(centre, forme.rayon, couleur);
  if (forme.centre === 'devant') monde.visuels.pics(centre, forme.rayon, couleur);
  for (const m of monde.monstres) {
    if (m.mort) continue;
    if (Math.hypot(m.position.x - centre.x, m.position.z - centre.z) <= forme.rayon + m.rayon) {
      toucherMonstre(monde, m, coup);
      monde.visuels.eclat(m.centre(), couleur, 6);
    }
  }
}

function lancerProjectile(monde, forme, coup, couleur) {
  const { heros } = monde;
  if (heros.mort) return;
  const { direction, cible } = directionAction(monde, forme.portee);
  const depart = new THREE.Vector3(
    heros.position.x + direction.x * 0.7,
    heros.position.y + HAUTEUR_TIR,
    heros.position.z + direction.z * 0.7
  );
  // Vise le centre de la cible en hauteur aussi.
  const vitesse = direction.clone();
  if (cible) {
    const versCible = cible.centre().sub(depart);
    vitesse.copy(versCible.normalize());
  }
  vitesse.multiplyScalar(forme.vitesse);
  const estFleche = monde.heros.classe.armePredilection === 'arc';
  const maillage = monde.visuels.creerProjectile(couleur, estFleche ? 'fleche' : 'orbe');
  maillage.position.copy(depart);
  maillage.lookAt(depart.clone().add(vitesse));
  if (!estFleche) maillage.scale.setScalar(Math.max(0.5, forme.rayon * 1.6));
  monde.projectiles.push({ maillage, vitesse, parcouru: 0, forme, coup, couleur, cible });
}

// Avance les projectiles, la ruée et les recharges.
export function mettreAJourCompetences(monde, dt) {
  const { heros } = monde;
  for (const [cle, temps] of heros.recharges) heros.recharges.set(cle, Math.max(0, temps - dt));
  heros.mana = Math.min(heros.stats.manaMax, heros.mana + heros.stats.manaMax * 0.02 * dt);
  if (heros.bouclierRestant > 0) {
    heros.bouclierRestant -= dt;
    if (heros.bouclierRestant <= 0) heros.bouclierAbsorbe = 0;
  }
  heros.modele.userData.parties.bulle.visible = heros.bouclierAbsorbe > 0;

  if (heros.attaque) {
    heros.attaque.temps += dt;
    if (heros.attaque.temps >= heros.attaque.duree) heros.attaque = null;
  }

  if (heros.ruee) {
    const ru = heros.ruee;
    ru.temps += dt;
    if (Math.random() < 0.6) monde.visuels.eclat(heros.position.clone().setY(heros.position.y + 1), ru.couleur, 2);
    for (const m of monde.monstres) {
      if (m.mort || ru.touches.has(m.uid)) continue;
      if (Math.hypot(m.position.x - heros.position.x, m.position.z - heros.position.z) < ru.largeur + m.rayon) {
        ru.touches.add(m.uid);
        toucherMonstre(monde, m, ru.coup);
        monde.visuels.eclat(m.centre(), ru.couleur, 8);
      }
    }
    if (ru.temps >= ru.duree) heros.ruee = null;
  }

  for (let i = monde.projectiles.length - 1; i >= 0; i--) {
    const p = monde.projectiles[i];
    // Légère correction vers la cible verrouillée.
    if (p.cible && !p.cible.mort) {
      const voulu = p.cible.centre().sub(p.maillage.position).normalize().multiplyScalar(p.forme.vitesse);
      p.vitesse.lerp(voulu, Math.min(1, dt * 4));
    }
    // Petits pas successifs : un projectile rapide ne traverse pas une cible sans la toucher.
    const total = p.vitesse.length() * dt;
    const nombrePas = Math.max(1, Math.ceil(total / 0.3));
    const pas = p.vitesse.clone().multiplyScalar(dt / nombrePas);
    const pos = p.maillage.position;
    let impact = null, bloque = false, sol = 0;
    for (let k = 0; k < nombrePas && !impact && !bloque; k++) {
      pos.add(pas);
      p.parcouru += pas.length();
      for (const m of monde.monstres) {
        if (m.mort) continue;
        const c = m.centre();
        if (Math.hypot(pos.x - c.x, pos.z - c.z) < m.rayon + p.forme.rayon && Math.abs(pos.y - c.y) < m.hauteur * 0.6 + p.forme.rayon) {
          impact = m;
          break;
        }
      }
      sol = monde.collisions.hauteur(pos.x, pos.z);
      bloque = pos.y <= sol || monde.collisions.estBloque(pos.x, pos.y, pos.z);
    }
    p.maillage.lookAt(pos.clone().add(p.vitesse));
    if (impact || bloque || p.parcouru > p.forme.portee) {
      if (p.forme.explosion && (impact || bloque)) {
        monde.visuels.anneau(pos.clone().setY(sol), p.forme.explosion, p.couleur);
        for (const m of monde.monstres) {
          if (!m.mort && m.centre().distanceTo(pos) < p.forme.explosion + m.rayon) toucherMonstre(monde, m, p.coup);
        }
      } else if (impact) {
        toucherMonstre(monde, impact, p.coup);
      }
      if (impact || bloque) monde.visuels.eclat(pos.clone(), p.couleur, 7);
      monde.visuels.retirer(p.maillage);
      monde.projectiles.splice(i, 1);
    }
  }
}
