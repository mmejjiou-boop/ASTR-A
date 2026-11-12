// Résolution des coups : dégâts, critiques, blocage, esquive, effets, vol de vie.
import { calculerDegats } from './stats.js';
import { appliquerEffet } from './effets.js';
import { emettre } from '../core/evenements.js';

// Le héros touche un monstre.
// coup : { attaque, coefficient, critique, effets, volVie }
export function toucherMonstre(monde, monstre, coup) {
  if (monstre.mort) return null;
  const { config } = monde.donnees;
  const resultat = calculerDegats(config, coup.attaque, coup.coefficient, monstre.stats.defense, coup.critique);
  monstre.recevoirDegats(resultat.degats, monde);
  emettre('degats', { position: monstre.positionTete(), montant: resultat.degats, critique: resultat.critique, cible: 'monstre' });

  if (!monstre.mort) {
    for (const effet of coup.effets || []) {
      if (appliquerEffet(monstre, effet, coup.attaque)) {
        emettre('effet', { position: monstre.positionTete(), id: effet.id });
      }
    }
  }
  if (coup.volVie) {
    const soin = monde.heros.soigner(Math.round(resultat.degats * coup.volVie));
    if (soin > 0) emettre('soin', { position: monde.heros.positionTete(), montant: soin });
  }
  return resultat;
}

// Un monstre touche le héros avec une de ses attaques.
export function toucherHeros(monde, monstre, attaque) {
  const heros = monde.heros;
  if (heros.mort) return;
  const { config } = monde.donnees;
  if (heros.invincible) {
    emettre('esquive', { position: heros.positionTete() });
    return;
  }
  const resultat = calculerDegats(config, monstre.stats.attaque, attaque.coefficient, heros.stats.defenseTotale, 0.05);
  let degats = resultat.degats;

  // Blocage : seulement si le héros fait face à l'attaquant.
  if (heros.bloque) {
    const dx = monstre.position.x - heros.position.x;
    const dz = monstre.position.z - heros.position.z;
    const longueur = Math.hypot(dx, dz) || 1;
    const face = (Math.sin(heros.orientation) * dx + Math.cos(heros.orientation) * dz) / longueur;
    if (face > 0.25) {
      degats = Math.max(1, Math.round(degats * 0.25));
      heros.endurance -= config.deplacement.coutBlocageParCoup;
      heros.delaiEndurance = config.deplacement.delaiRecuperation;
      if (heros.endurance <= 0) {
        heros.endurance = 0;
        heros.epuise = true;
      }
      emettre('bloque', { position: heros.positionTete() });
    }
  }

  // Le bouclier divin absorbe d'abord.
  if (heros.bouclierAbsorbe > 0) {
    const absorbe = Math.min(heros.bouclierAbsorbe, degats);
    heros.bouclierAbsorbe -= absorbe;
    degats -= absorbe;
    if (heros.bouclierAbsorbe <= 0) heros.bouclierRestant = 0;
  }

  if (degats > 0) {
    heros.vie -= degats;
    emettre('degats', { position: heros.positionTete(), montant: degats, critique: resultat.critique, cible: 'heros' });
  }
  if (heros.vie <= 0) {
    heros.vie = 0;
    monde.mortHeros();
  }
}
