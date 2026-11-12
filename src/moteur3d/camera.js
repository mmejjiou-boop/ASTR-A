// Caméra orbitale à la troisième personne, contrôlée à la souris.
// Avec une cible verrouillée, elle se place derrière le héros face à la cible.
import * as THREE from 'three';

export function creerCamera(camera, config, collisions) {
  const reglages = config.camera;
  const etat = {
    lacet: Math.PI,      // rotation horizontale
    tangage: 0.35,       // rotation verticale
    distance: reglages.distance,
    sensibilite: 1,
    inverserY: false,
  };
  const pivot = new THREE.Vector3();
  const position = new THREE.Vector3();
  const regard = new THREE.Vector3();
  const regardLisse = new THREE.Vector3();
  let verrouillage = 0; // 0 → 1 : transition douce vers la vue de verrouillage

  function mettreAJour(dt, entrees, cibleHeros, cibleVerrouillee) {
    const s = reglages.sensibilite * etat.sensibilite;
    etat.lacet -= entrees.souris.dx * s;
    etat.tangage += entrees.souris.dy * s * (etat.inverserY ? -1 : 1);
    etat.tangage = Math.max(-0.5, Math.min(1.2, etat.tangage));
    etat.distance = Math.max(reglages.distanceMin, Math.min(reglages.distanceMax, etat.distance + entrees.souris.molette * 0.8));

    if (cibleVerrouillee) {
      // Lacet voulu : derrière le héros, regard vers la cible.
      const dx = cibleVerrouillee.x - cibleHeros.x;
      const dz = cibleVerrouillee.z - cibleHeros.z;
      const voulu = Math.atan2(-dx, -dz);
      let ecart = voulu - etat.lacet;
      ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
      etat.lacet += ecart * Math.min(1, dt * 8);
      etat.tangage += (0.42 - etat.tangage) * Math.min(1, dt * 4);
    }
    verrouillage += ((cibleVerrouillee ? 1 : 0) - verrouillage) * Math.min(1, dt * 5);

    pivot.set(cibleHeros.x, cibleHeros.y + reglages.hauteur, cibleHeros.z);
    const horizontal = Math.cos(etat.tangage) * etat.distance;
    position.set(
      pivot.x + Math.sin(etat.lacet) * horizontal,
      pivot.y + Math.sin(etat.tangage) * etat.distance,
      pivot.z + Math.cos(etat.lacet) * horizontal
    );
    // Verrouillage : caméra décalée par-dessus l'épaule, regard entre le héros et la cible,
    // pour que le héros ne cache pas l'ennemi.
    regard.copy(pivot);
    if (verrouillage > 0.01) {
      const decalage = 1.1 * verrouillage;
      position.x += Math.cos(etat.lacet) * decalage;
      position.z += -Math.sin(etat.lacet) * decalage;
      position.y += 0.6 * verrouillage;
      if (cibleVerrouillee) {
        regard.lerp(new THREE.Vector3(cibleVerrouillee.x, cibleVerrouillee.y + 1, cibleVerrouillee.z), 0.35 * verrouillage);
      }
    }
    // La caméra ne passe jamais sous le sol.
    const sol = collisions.hauteur(position.x, position.z) + 0.6;
    if (position.y < sol) position.y = sol;

    camera.position.lerp(position, Math.min(1, dt * 18));
    if (regardLisse.lengthSq() === 0 || dt === 0) regardLisse.copy(regard);
    else regardLisse.lerp(regard, Math.min(1, dt * 12));
    camera.lookAt(regardLisse);
  }

  return {
    etat,
    mettreAJour,
    // Direction « avant » de la caméra sur le plan du sol.
    avant: () => new THREE.Vector3(-Math.sin(etat.lacet), 0, -Math.cos(etat.lacet)),
    droite: () => new THREE.Vector3(Math.cos(etat.lacet), 0, -Math.sin(etat.lacet)),
    placerDerriere(orientation) {
      etat.lacet = orientation + Math.PI;
    },
  };
}
