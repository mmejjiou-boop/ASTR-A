// Personnages non joueurs : villageois, marchands, donneurs de quêtes.
import * as THREE from 'three';
import { creerHumanoide, creerTableau } from '../moteur3d/formes.js';

export class Pnj {
  constructor(def, position, centre) {
    this.def = def;
    this.id = def.id;
    this.spawn = position.clone();
    this.position = position.clone();
    // Tourné vers la place du village.
    this.orientation = Math.atan2(centre.x - position.x, centre.z - position.z);
    this.vitesseActuelle = 0;
    this.cible = null;
    this.pause = Math.random() * 4;
    this.estObjet = def.apparence.forme === 'tableau';
    this.modele = this.estObjet ? creerTableau(def.apparence.couleurs) : creerHumanoide(def.apparence);
    this.modele.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.rayon = this.estObjet ? 1.1 : 0.4;
  }

  positionTete() {
    return new THREE.Vector3(this.position.x, this.position.y + (this.estObjet ? 2.9 : 2.5), this.position.z);
  }

  // Promenade tranquille autour de son point de départ.
  mettreAJour(dt, collisions, heros) {
    this.vitesseActuelle = 0;
    const versHeros = Math.hypot(heros.position.x - this.position.x, heros.position.z - this.position.z);
    if (!this.estObjet && versHeros < 4) {
      // Regarde le héros quand il s'approche.
      this.orientation = Math.atan2(heros.position.x - this.position.x, heros.position.z - this.position.z);
    } else if (this.def.routine === 'promenade') {
      if (this.pause > 0) this.pause -= dt;
      else {
        if (!this.cible) {
          const a = Math.random() * Math.PI * 2;
          this.cible = { x: this.spawn.x + Math.cos(a) * 8, z: this.spawn.z + Math.sin(a) * 8 };
        }
        const dx = this.cible.x - this.position.x, dz = this.cible.z - this.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) {
          this.cible = null;
          this.pause = 2 + Math.random() * 5;
        } else {
          const pas = Math.min(d, 1.4 * dt);
          this.position.x += (dx / d) * pas;
          this.position.z += (dz / d) * pas;
          this.orientation = Math.atan2(dx, dz);
          this.vitesseActuelle = 1.4;
          collisions.resoudre(this.position, this.rayon);
        }
      }
    }
    this.position.y = collisions.hauteur(this.position.x, this.position.z);
    this.modele.position.copy(this.position);
    this.modele.rotation.y = this.orientation;
  }
}
