// Un monstre : statistiques calculées par les formules, modèle 3D, état d'IA.
import * as THREE from 'three';
import { calculerStatsMonstre } from '../systemes/stats.js';
import { creerModeleMonstre } from '../moteur3d/formes.js';

let compteur = 0;

export class Monstre {
  constructor(donnees, def, niveau, spawn, zone) {
    this.uid = ++compteur;
    this.def = def;
    this.niveau = niveau;
    this.stats = calculerStatsMonstre(donnees.config, def, niveau);
    this.vie = this.stats.vieMax;
    this.spawn = spawn.clone();
    this.zone = zone;
    this.position = spawn.clone();
    this.orientation = Math.random() * Math.PI * 2;
    this.vitesseActuelle = 0;
    this.etat = 'patrouille'; // patrouille | poursuite | retour
    this.pointPatrouille = null;
    this.pause = Math.random() * 2;
    this.effets = [];
    this.recharges = new Map();
    this.attaqueEnCours = null; // { def, temps, telegraphe, direction }
    this.animAttaque = -1;
    this.mort = false;
    this.phase = 0;            // phase d'un boss
    this.endormi = false;      // monstre de donjon qui attend que le héros entre dans sa salle
    this.tempsMort = 0;
    this.dernierCoup = -99;
    const taille = def.modele.taille || 1;
    const forme = def.modele.forme;
    this.rayon = (forme === 'sanglier' ? 0.7 : 0.55) * taille;
    this.hauteur = (forme === 'quadrupede' || forme === 'sanglier' ? 1.2 : forme === 'insecte' ? 0.8 : 1.7) * taille;
    this.modele = creerModeleMonstre(def.modele);
    this.modele.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  positionTete() {
    return new THREE.Vector3(this.position.x, this.position.y + this.hauteur + 0.3, this.position.z);
  }

  centre() {
    const y = this.def.volant ? this.position.y : this.position.y + this.hauteur * 0.55;
    return new THREE.Vector3(this.position.x, y, this.position.z);
  }

  recevoirDegats(montant, monde) {
    this.vie -= montant;
    this.dernierCoup = monde.temps;
    if (this.etat !== 'poursuite') monde.alerter(this);
    if (this.vie <= 0) {
      this.vie = 0;
      monde.tuerMonstre(this);
    }
  }
}
