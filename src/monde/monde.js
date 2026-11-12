// Construit un monde à partir de son fichier de données et fait vivre
// le héros, les monstres et les projectiles.
import * as THREE from 'three';
import { creerTerrain } from '../moteur3d/terrain.js';
import { creerCollisions } from '../moteur3d/collisions.js';
import { creerEffetsVisuels } from '../moteur3d/effetsVisuels.js';
import { animer } from '../moteur3d/animations.js';
import { Monstre } from '../entites/monstre.js';
import { mettreAJourMonstre } from '../systemes/ia.js';
import { mettreAJourCompetences } from '../systemes/competences.js';
import { mettreAJourEffets } from '../systemes/effets.js';
import { creerHasard } from '../core/hasard.js';
import { emettre } from '../core/evenements.js';

const MAX_ATTAQUANTS = 3;

export function creerMonde(donnees, rendu, defMonde, heros, camera) {
  const { config } = donnees;
  const terrain = creerTerrain(defMonde);
  const collisions = creerCollisions(terrain);
  const visuels = creerEffetsVisuels(rendu.scene);
  rendu.scene.add(terrain.groupe);
  rendu.definirAmbiance(defMonde.terrain.palette, Math.min(config.distanceVue, defMonde.taille * 0.9));

  const monde = {
    donnees,
    def: defMonde,
    terrain,
    collisions,
    visuels,
    heros,
    camera,
    monstres: [],
    projectiles: [],
    cible: null,
    temps: 0,
    taches: [],
    reapparitions: [],
    tempsMortHeros: 0,

    // Exécute une action après un délai (moment de l'impact d'une attaque).
    planifier(delai, action) {
      this.taches.push({ temps: this.temps + delai, action });
    },

    // Un monstre repère le héros. Les loups préviennent leur meute.
    alerter(monstre) {
      if (monstre.mort || heros.mort) return;
      monstre.etat = 'poursuite';
      if (monstre.def.comportement.type === 'meute') {
        for (const autre of this.monstres) {
          if (autre !== monstre && !autre.mort && autre.def.famille === monstre.def.famille && autre.etat === 'patrouille'
            && autre.position.distanceTo(monstre.position) < 25) {
            autre.etat = 'poursuite';
          }
        }
      }
    },

    // Au plus 3 monstres annoncent une attaque en même temps (plus lisible).
    limiteAttaquants(monstre) {
      let attaquants = 0;
      for (const m of this.monstres) if (m !== monstre && m.attaqueEnCours) attaquants++;
      return attaquants >= MAX_ATTAQUANTS;
    },

    tuerMonstre(monstre) {
      if (monstre.mort) return;
      monstre.mort = true;
      monstre.tempsMort = 0;
      if (monstre.attaqueEnCours) {
        monstre.attaqueEnCours.telegraphe.retirer();
        monstre.attaqueEnCours = null;
      }
      if (this.cible === monstre) this.cible = null;
      const butin = donnees.butin.get(monstre.def.butin);
      const or = butin ? hasard.entier(butin.or[0], butin.or[1]) : 0;
      heros.gagnerXP(monstre.stats.xp);
      heros.gagnerOr(or);
      emettre('monstreTue', { monstre, xp: monstre.stats.xp, or, position: monstre.positionTete() });
      this.reapparitions.push({ temps: this.temps + config.monstres.reapparition, monstre });
    },

    mortHeros() {
      if (heros.mort) return;
      heros.mort = true;
      heros.attaque = heros.roulade = heros.ruee = null;
      this.tempsMortHeros = 0;
      this.cible = null;
      // Pas de pénalité dans le monde 1 (ni dans la zone de test).
      const sansPenalite = config.mort.mondeSansPenalite.includes(defMonde.id);
      let perte = 0;
      if (!sansPenalite) {
        perte = Math.floor(heros.or * config.mort.perteOr);
        heros.or -= perte;
      }
      emettre('mortHeros', { perte });
    },

    reapparaitreHeros() {
      heros.mort = false;
      heros.vie = heros.stats.vieMax;
      heros.mana = heros.stats.manaMax;
      heros.endurance = config.deplacement.enduranceMax;
      heros.effets = [];
      this.placerHeros(defMonde.depart[0], defMonde.depart[1]);
      for (const m of this.monstres) if (m.etat === 'poursuite') m.etat = 'retour';
      emettre('reapparition', {});
    },

    placerHeros(x, z, orientation = 0) {
      heros.position.set(x, collisions.hauteur(x, z), z);
      heros.vitesse.set(0, 0, 0);
      heros.vitesseY = 0;
      heros.orientation = orientation;
      camera.placerDerriere(orientation);
    },

    // Verrouillage : le monstre le plus proche devant la caméra, puis le suivant.
    changerCible() {
      const avant = camera.avant();
      const candidats = this.monstres
        .filter((m) => !m.mort && m.position.distanceTo(heros.position) < 28)
        .map((m) => {
          const dx = m.position.x - heros.position.x, dz = m.position.z - heros.position.z;
          const d = Math.hypot(dx, dz) || 1;
          return { m, score: d * (2.2 - (dx * avant.x + dz * avant.z) / d) };
        })
        .sort((a, b) => a.score - b.score)
        .map((c) => c.m);
      if (!candidats.length) {
        this.cible = null;
        return;
      }
      const index = candidats.indexOf(this.cible);
      this.cible = index === -1 ? candidats[0] : candidats[index + 1] || null;
    },

    mettreAJour(dt, vitesseHeros) {
      this.temps += dt;
      for (let i = this.taches.length - 1; i >= 0; i--) {
        if (this.taches[i].temps <= this.temps) {
          const tache = this.taches.splice(i, 1)[0];
          tache.action();
        }
      }

      mettreAJourCompetences(this, dt);
      mettreAJourEffets(heros, dt, (montant) => {
        if (heros.mort) return;
        heros.vie -= montant;
        emettre('degats', { position: heros.positionTete(), montant, cible: 'heros' });
        if (heros.vie <= 0) { heros.vie = 0; this.mortHeros(); }
      });

      if (heros.mort) {
        this.tempsMortHeros += dt;
        if (this.tempsMortHeros >= config.mort.delaiReapparition) this.reapparaitreHeros();
      }

      if (this.cible && (this.cible.mort || this.cible.position.distanceTo(heros.position) > 35)) this.cible = null;

      for (const m of this.monstres) {
        if (m.mort) {
          // Le corps s'enfonce puis disparaît.
          m.tempsMort += dt;
          m.modele.position.y -= dt * 0.6;
          m.modele.rotation.z = Math.min(Math.PI / 2, m.tempsMort * 4);
          m.modele.visible = m.tempsMort < 2;
          continue;
        }
        // Les monstres lointains dorment (performance).
        if (m.position.distanceTo(heros.position) > config.monstres.distanceActivation && m.etat === 'patrouille') continue;
        mettreAJourMonstre(m, dt, this);
        separer(m, this.monstres);
        m.modele.position.copy(m.position);
        m.modele.rotation.set(0, m.orientation, 0);
        animer(m.modele, { vitesse: m.vitesseActuelle, temps: this.temps + m.uid, attaque: m.animAttaque, roulade: -1, incantation: 0 });
      }

      for (let i = this.reapparitions.length - 1; i >= 0; i--) {
        const r = this.reapparitions[i];
        // Pas de réapparition sous les yeux du héros.
        if (r.temps <= this.temps && r.monstre.spawn.distanceTo(heros.position) > 30) {
          this.reapparitions.splice(i, 1);
          this.retirerMonstre(r.monstre);
          this.ajouterMonstre(r.monstre.def, r.monstre.niveau, r.monstre.spawn, r.monstre.zone);
        }
      }

      heros.modele.position.copy(heros.position);
      heros.modele.rotation.set(0, heros.orientation, 0);
      heros.modele.visible = !heros.mort || this.tempsMortHeros < 1.2;
      if (heros.mort) heros.modele.rotation.z = Math.min(Math.PI / 2, this.tempsMortHeros * 3);
      animer(heros.modele, {
        vitesse: heros.auSol ? vitesseHeros : 0,
        temps: this.temps,
        attaque: heros.attaque && !heros.attaque.incantation ? heros.attaque.temps / heros.attaque.duree : -1,
        incantation: heros.attaque?.incantation ? heros.attaque.temps / heros.attaque.duree : 0,
        blocage: heros.bloque,
        roulade: heros.roulade ? heros.roulade.temps / donnees.config.deplacement.roulade.duree : -1,
        enAir: !heros.auSol && !heros.roulade,
      });
      visuels.mettreAJour(dt);
    },

    ajouterMonstre(def, niveau, spawn, zone) {
      const m = new Monstre(donnees, def, niveau, spawn, zone);
      m.position.y = collisions.hauteur(m.position.x, m.position.z);
      m.modele.position.copy(m.position);
      rendu.scene.add(m.modele);
      this.monstres.push(m);
      return m;
    },

    retirerMonstre(m) {
      rendu.scene.remove(m.modele);
      this.monstres.splice(this.monstres.indexOf(m), 1);
    },

    detruire() {
      rendu.scene.remove(terrain.groupe);
      rendu.scene.remove(heros.modele);
      for (const m of this.monstres) rendu.scene.remove(m.modele);
      for (const p of this.projectiles) visuels.retirer(p.maillage);
      visuels.vider();
      terrain.groupe.traverse((o) => { o.geometry?.dispose(); });
    },
  };

  // Apparition des monstres dans chaque zone, à des points tirés au hasard (graine fixe).
  const hasard = creerHasard(defMonde.terrain.graine + 99);
  for (const zone of defMonde.zones || []) {
    for (const [idMonstre, nombre] of zone.monstres) {
      const def = donnees.monstres.get(idMonstre);
      if (!def) { console.warn(`Monstre inconnu : ${idMonstre}`); continue; }
      for (let i = 0; i < nombre; i++) {
        const angle = hasard.entre(0, Math.PI * 2);
        const rayon = Math.sqrt(hasard.suivant()) * zone.rayon;
        const spawn = new THREE.Vector3(zone.centre[0] + Math.cos(angle) * rayon, 0, zone.centre[1] + Math.sin(angle) * rayon);
        collisions.resoudre(spawn, 0.6);
        monde.ajouterMonstre(def, hasard.entier(def.niveaux[0], def.niveaux[1]), spawn, zone.id);
      }
    }
  }

  rendu.scene.add(heros.modele);
  return monde;
}

// Les monstres ne se superposent pas.
function separer(monstre, monstres) {
  for (const autre of monstres) {
    if (autre === monstre || autre.mort) continue;
    const dx = monstre.position.x - autre.position.x;
    const dz = monstre.position.z - autre.position.z;
    const d = Math.hypot(dx, dz);
    const minimum = monstre.rayon + autre.rayon;
    if (d > 0.001 && d < minimum) {
      const pousse = (minimum - d) / d * 0.5;
      monstre.position.x += dx * pousse;
      monstre.position.z += dz * pousse;
    }
  }
}
