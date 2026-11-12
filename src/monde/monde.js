// Fait vivre un monde (extérieur ou donjon) à partir de ses données :
// terrain, constructions, PNJ, monstres, projectiles, interactions,
// découverte des lieux et brouillard de la carte.
import * as THREE from 'three';
import { creerTerrain, creerSolPlat } from '../moteur3d/terrain.js';
import { creerCollisions } from '../moteur3d/collisions.js';
import { creerEffetsVisuels } from '../moteur3d/effetsVisuels.js';
import { animer } from '../moteur3d/animations.js';
import { Monstre } from '../entites/monstre.js';
import { Pnj } from '../entites/pnj.js';
import { mettreAJourMonstre, mettreAJourProjectilesMonstres } from '../systemes/ia.js';
import { mettreAJourCompetences } from '../systemes/competences.js';
import { mettreAJourEffets } from '../systemes/effets.js';
import { tirerButin } from '../systemes/butin.js';
import { ajouter } from '../systemes/inventaire.js';
import { construireStructures, zonesPlates } from './structures.js';
import { construireDonjon } from './donjon.js';
import { creerHasard } from '../core/hasard.js';
import { emettre } from '../core/evenements.js';
import { t } from '../core/textes.js';

const MAX_ATTAQUANTS = 3;

// contexte : { donnees, rendu, heros, camera, progression, quetes, actions }
// def : un monde (data/mondes/*.json) ou un donjon (data/donjons.json, avec estDonjon: true)
export function creerMonde(contexte, def) {
  const { donnees, rendu, heros, camera, progression, quetes, actions } = contexte;
  const { config } = donnees;
  const estDonjon = Boolean(def.estDonjon);
  const terrain = estDonjon ? creerSolPlat(def.taille) : creerTerrain(def, zonesPlates(def));
  const collisions = creerCollisions(terrain);
  for (const o of terrain.obstaclesNaturels) collisions.ajouterObstacle(o);
  const visuels = creerEffetsVisuels(rendu.scene);
  const groupe = new THREE.Group();
  groupe.add(terrain.groupe);
  rendu.scene.add(groupe);
  const palette = estDonjon ? def.palette : def.terrain.palette;
  rendu.definirAmbiance(palette, estDonjon ? 140 : Math.min(config.distanceVue, def.taille * 0.9));
  const hasard = creerHasard((def.terrain?.graine || 7) + 99);

  const monde = {
    donnees, def, terrain, collisions, visuels, heros, camera, groupe,
    estDonjon,
    idCarte: estDonjon ? null : def.id,
    monstres: [],
    pnjs: [],
    projectiles: [],
    projectilesMonstres: [],
    interactifs: [],
    animations: [],
    points: null,
    cible: null,
    temps: 0,
    taches: [],
    reapparitions: [],
    tempsMortHeros: 0,
    chronoBrouillard: 0,
    logiqueDonjon: null,

    planifier(delai, action) {
      this.taches.push({ temps: this.temps + delai, action });
    },

    // Un monstre repère le héros. Les meutes s'alertent entre elles.
    alerter(monstre) {
      if (monstre.mort || heros.mort || monstre.endormi) return;
      monstre.etat = 'poursuite';
      if (monstre.def.comportement.type === 'meute') {
        for (const autre of this.monstres) {
          if (autre !== monstre && !autre.mort && !autre.endormi && autre.def.famille === monstre.def.famille && autre.etat === 'patrouille'
            && autre.position.distanceTo(monstre.position) < 25) {
            autre.etat = 'poursuite';
          }
        }
      }
    },

    limiteAttaquants(monstre) {
      let attaquants = 0;
      for (const m of this.monstres) if (m !== monstre && m.attaqueEnCours) attaquants++;
      return attaquants >= MAX_ATTAQUANTS;
    },

    // Un monstre en appelle d'autres autour de lui (boss, reine).
    invoquer(source, idMonstre, nombre) {
      const def = donnees.monstres.get(idMonstre);
      if (!def) return;
      const vivants = this.monstres.filter((m) => !m.mort && m.invoqueur === source).length;
      for (let k = 0; k < Math.min(nombre, 6 - vivants); k++) {
        const a = (k / nombre) * Math.PI * 2 + Math.random();
        const p = new THREE.Vector3(source.position.x + Math.cos(a) * 4, 0, source.position.z + Math.sin(a) * 4);
        collisions.resoudre(p, 0.6);
        const m = this.ajouterMonstre(def, Math.max(def.niveaux[0], source.niveau - 2), p, source.zone);
        m.invoqueur = source;
        m.sansReapparition = true;
        m.etat = 'poursuite';
        visuels.anneau(p, 2, 0x7fff4a, 0.5);
      }
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
      const butin = tirerButin(donnees, monstre.def.butin, monstre.niveau, quetes);
      heros.gagnerOr(butin.or);
      for (const o of butin.objets) {
        if (ajouter(heros, donnees, o.id, o.quantite)) emettre('message', { cle: 'msg.objet', valeurs: { nom: t(`objet.${o.id}.nom`), q: o.quantite > 1 ? ` ×${o.quantite}` : '' } });
      }
      if (monstre.def.boss) {
        progression.bossVaincus.add(monstre.def.id);
        emettre('message', { cle: 'msg.bossVaincu', valeurs: { nom: t(`${monstre.def.texte}.nom`) }, grand: true });
      }
      emettre('monstreTue', { monstre, xp: monstre.stats.xp, or: butin.or, position: monstre.positionTete() });
      heros.gagnerXP(monstre.stats.xp);
      if (!estDonjon && !monstre.sansReapparition && !monstre.def.boss) {
        this.reapparitions.push({ temps: this.temps + config.monstres.reapparition, monstre });
      }
    },

    mortHeros() {
      if (heros.mort) return;
      heros.mort = true;
      heros.attaque = heros.roulade = heros.ruee = heros.escalade = null;
      this.tempsMortHeros = 0;
      this.cible = null;
      const idMonde = estDonjon ? def.monde : def.id;
      const sansPenalite = config.mort.mondeSansPenalite.includes(idMonde);
      let perte = 0;
      if (!sansPenalite) {
        perte = Math.floor(heros.or * config.mort.perteOr);
        heros.or -= perte;
      }
      emettre('mortHeros', { perte });
    },

    placerHeros(x, z, orientation = 0, y = null) {
      // Par défaut : au sol (sous les plateformes éventuelles).
      heros.position.set(x, y ?? collisions.hauteur(x, z), z);
      heros.vitesse.set(0, 0, 0);
      heros.vitesseY = 0;
      heros.escalade = null;
      heros.orientation = orientation;
      camera.placerDerriere(orientation);
      terrain.mettreAJour(heros.position);
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
      if (!candidats.length) { this.cible = null; return; }
      const index = candidats.indexOf(this.cible);
      this.cible = index === -1 ? candidats[0] : candidats[index + 1] || null;
    },

    // Point d'interaction le plus proche (PNJ, coffre, levier…), ou null.
    interactionProche() {
      if (heros.mort || heros.escalade) return null;
      let meilleur = null, meilleureDistance = Infinity;
      for (const i of this.interactifs) {
        if (i.visible && !i.visible()) continue;
        const d = i.position.distanceTo(heros.position);
        if (d < (i.distance || config.interaction.distance) && d < meilleureDistance) {
          meilleur = i;
          meilleureDistance = d;
        }
      }
      return meilleur;
    },

    mettreAJour(dt, vitesseHeros) {
      this.temps += dt;
      for (let i = this.taches.length - 1; i >= 0; i--) {
        if (this.taches[i].temps <= this.temps) this.taches.splice(i, 1)[0].action();
      }

      mettreAJourCompetences(this, dt);
      mettreAJourProjectilesMonstres(this, dt);
      mettreAJourEffets(heros, dt, (montant) => {
        if (heros.mort) return;
        heros.vie -= montant;
        emettre('degats', { position: heros.positionTete(), montant, cible: 'heros' });
        if (heros.vie <= 0) { heros.vie = 0; this.mortHeros(); }
      });

      if (heros.mort) {
        this.tempsMortHeros += dt;
        if (this.tempsMortHeros >= config.mort.delaiReapparition) actions.reapparaitre();
      }
      if (this.cible && (this.cible.mort || this.cible.position.distanceTo(heros.position) > 35)) this.cible = null;

      terrain.mettreAJour(heros.position);
      for (const f of this.animations) f(this.temps);

      for (const m of this.monstres) {
        const distance = m.position.distanceTo(heros.position);
        if (m.mort) {
          m.tempsMort += dt;
          m.modele.position.y -= dt * 0.6;
          m.modele.rotation.z = Math.min(Math.PI / 2, m.tempsMort * 4);
          m.modele.visible = m.tempsMort < 2;
          continue;
        }
        // Les monstres lointains dorment et ne sont pas dessinés (performance).
        m.modele.visible = distance < config.monstres.distanceAffichage;
        if (distance > config.monstres.distanceActivation && m.etat === 'patrouille') continue;
        mettreAJourMonstre(m, dt, this);
        separer(m, this.monstres);
        m.modele.position.copy(m.position);
        m.modele.rotation.set(0, m.orientation, 0);
        animer(m.modele, { vitesse: m.vitesseActuelle, temps: this.temps + m.uid, attaque: m.animAttaque, roulade: -1, incantation: 0 });
      }
      this.monstres = this.monstres.filter((m) => !(m.mort && m.tempsMort > 2.5 && m.sansReapparition) || retirer(m));

      for (let i = this.reapparitions.length - 1; i >= 0; i--) {
        const r = this.reapparitions[i];
        if (r.temps <= this.temps && r.monstre.spawn.distanceTo(heros.position) > 40) {
          this.reapparitions.splice(i, 1);
          retirer(r.monstre);
          this.monstres.splice(this.monstres.indexOf(r.monstre), 1);
          this.ajouterMonstre(r.monstre.def, r.monstre.niveau, r.monstre.spawn, r.monstre.zone);
        }
      }

      for (const p of this.pnjs) {
        if (p.position.distanceTo(heros.position) > 150) continue;
        p.mettreAJour(dt, collisions, heros);
        animer(p.modele, { vitesse: p.vitesseActuelle, temps: this.temps + p.spawn.x, attaque: -1, roulade: -1, incantation: 0, penche: p.def.apparence.age ? 0.15 : 0 });
      }

      if (!estDonjon) this.decouvrir(dt);
      this.logiqueDonjon?.mettreAJour(dt);

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
        roulade: heros.roulade ? heros.roulade.temps / config.deplacement.roulade.duree : -1,
        enAir: !heros.auSol && !heros.roulade && !heros.escalade,
        escalade: heros.escalade ? heros.escalade.mouvement : null,
      });
      visuels.mettreAJour(dt);
    },

    // Brouillard de la carte, lieux découverts, arrivée au village.
    decouvrir(dt) {
      this.chronoBrouillard -= dt;
      if (this.chronoBrouillard <= 0) {
        this.chronoBrouillard = 0.4;
        if (progression.reveler(def.id, def.taille, heros.position.x, heros.position.z, config.brouillard.rayonRevele)) emettre('brouillard', {});
      }
      for (const l of this.points.lieux) {
        if (Math.hypot(l.x - heros.position.x, l.z - heros.position.z) < 25 && progression.visiterLieu(def.id, l.id)) {
          emettre('message', { cle: 'msg.lieu', valeurs: { nom: t(`lieu.${l.id}`) }, grand: true });
          emettre('lieuDecouvert', { lieu: l.id });
          actions.sauvegarder();
        }
      }
      const v = this.points.village;
      if (v && Math.hypot(v.x - heros.position.x, v.z - heros.position.z) < def.village.rayon && progression.visiterLieu(def.id, v.id)) {
        emettre('message', { cle: 'msg.village', valeurs: { nom: t(v.texte) }, grand: true });
        actions.sauvegarder();
      }
    },

    ajouterMonstre(defMonstre, niveau, spawn, zone) {
      const m = new Monstre(donnees, defMonstre, niveau, spawn, zone);
      m.position.y = collisions.hauteur(m.position.x, m.position.z);
      m.modele.position.copy(m.position);
      groupe.add(m.modele);
      this.monstres.push(m);
      return m;
    },

    detruire() {
      rendu.scene.remove(groupe);
      for (const p of this.projectiles) visuels.retirer(p.maillage);
      for (const p of this.projectilesMonstres) visuels.retirer(p.maillage);
      for (const m of this.monstres) m.attaqueEnCours?.telegraphe.retirer();
      visuels.vider();
      groupe.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    },
  };

  function retirer(m) {
    groupe.remove(m.modele);
    return false;
  }

  if (estDonjon) {
    monde.logiqueDonjon = construireDonjon(def, contexte, monde);
  } else {
    construireMondeOuvert(monde, contexte, def, hasard);
  }
  groupe.add(heros.modele);
  return monde;
}

function construireMondeOuvert(monde, contexte, def, hasard) {
  const { donnees, progression, actions } = contexte;
  const { collisions } = monde;
  const ctxStructures = { collisions, terrain: monde.terrain, groupe: monde.groupe, animations: monde.animations, monde: def };
  const points = construireStructures(def, ctxStructures);
  monde.points = points;
  const carte = progression.carteDe(def.id);

  // Tour : éveil au sommet.
  if (points.tour) {
    const tour = points.tour;
    tour.definirActive(carte.toursActivees.includes(tour.id));
    monde.interactifs.push({
      id: tour.id,
      position: new THREE.Vector3(tour.x, tour.base + tour.hauteur, tour.z),
      distance: 4,
      texte: () => t('interaction.tour'),
      visible: () => !carte.toursActivees.includes(tour.id),
      action: () => actions.activerTour(tour),
    });
  }

  // Coffres.
  for (const c of points.coffres) {
    if (progression.coffresOuverts.has(c.id)) c.ouvrir(true);
    monde.interactifs.push({
      id: c.id,
      position: new THREE.Vector3(c.x, monde.terrain.hauteur(c.x, c.z), c.z),
      distance: 2.6,
      texte: () => t('interaction.coffre'),
      visible: () => !progression.coffresOuverts.has(c.id),
      action: () => {
        c.ouvrir();
        ouvrirCoffre(contexte, c.id, c.butin, def.niveaux[1]);
      },
    });
  }

  // Entrées de donjon.
  for (const d of points.donjons) {
    const defDonjon = donnees.donjons.get(d.id);
    monde.interactifs.push({
      id: d.id,
      position: new THREE.Vector3(d.x + Math.sin(d.angle) * 1.5, monde.terrain.hauteur(d.x, d.z), d.z + Math.cos(d.angle) * 1.5),
      distance: 4,
      texte: () => t('interaction.donjon', { nom: t(defDonjon.texte) }),
      action: () => actions.entrerDonjon(d.id),
    });
  }

  // PNJ du village.
  const centre = new THREE.Vector3(def.village?.position[0] || 0, 0, def.village?.position[1] || 0);
  for (const p of donnees.pnj.values()) {
    if (p.monde !== def.id) continue;
    const position = new THREE.Vector3(centre.x + p.position[0], 0, centre.z + p.position[1]);
    position.y = monde.terrain.hauteur(position.x, position.z);
    const pnj = new Pnj(p, position, centre);
    pnj.mettreAJour(0, collisions, monde.heros);
    monde.groupe.add(pnj.modele);
    monde.pnjs.push(pnj);
    if (pnj.estObjet) collisions.ajouterObstacle({ type: 'boite', x: position.x, z: position.z, demiL: 1.1, demiP: 0.3, angle: pnj.orientation, h: 2.3 });
    monde.interactifs.push({
      id: p.id,
      pnj,
      get position() { return pnj.position; },
      distance: pnj.estObjet ? 3 : 2.8,
      texte: () => (pnj.estObjet ? t('interaction.tableau') : t('interaction.parler', { nom: t(`pnj.${p.id}.nom`) })),
      action: () => actions.ouvrirDialogue(pnj),
    });
  }

  // Monstres des zones (niveaux selon leur fiche).
  for (const zone of def.zones || []) {
    for (const [idMonstre, nombre] of zone.monstres) {
      const defMonstre = donnees.monstres.get(idMonstre);
      if (!defMonstre) { console.warn(`Monstre inconnu : ${idMonstre}`); continue; }
      for (let i = 0; i < nombre; i++) {
        const angle = hasard.entre(0, Math.PI * 2);
        const rayon = Math.sqrt(hasard.suivant()) * zone.rayon;
        const spawn = new THREE.Vector3(zone.centre[0] + Math.cos(angle) * rayon, 0, zone.centre[1] + Math.sin(angle) * rayon);
        if (monde.terrain.hauteur(spawn.x, spawn.z) < monde.terrain.niveauEau + 0.5) continue; // pas dans la rivière
        spawn.y = monde.terrain.hauteur(spawn.x, spawn.z);
        collisions.resoudre(spawn, 0.6);
        monde.ajouterMonstre(defMonstre, hasard.entier(defMonstre.niveaux[0], defMonstre.niveaux[1]), spawn, zone.id);
      }
    }
  }
}

// Coffre : butin donné une seule fois (l'identifiant est mémorisé dans la sauvegarde).
export function ouvrirCoffre(contexte, idCoffre, idButin, niveau) {
  const { donnees, progression, heros, quetes, actions } = contexte;
  if (progression.coffresOuverts.has(idCoffre)) {
    emettre('message', { cle: 'msg.coffreVide' });
    return;
  }
  progression.coffresOuverts.add(idCoffre);
  const butin = tirerButin(donnees, idButin, Math.max(heros.niveau, niveau), quetes);
  heros.gagnerOr(butin.or);
  emettre('message', { cle: 'msg.or', valeurs: { n: butin.or } });
  for (const o of butin.objets) {
    if (ajouter(heros, donnees, o.id, o.quantite)) emettre('message', { cle: 'msg.objet', valeurs: { nom: t(`objet.${o.id}.nom`), q: '' } });
  }
  emettre('coffreOuvert', { coffre: idCoffre });
  actions.sauvegarder();
}

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
