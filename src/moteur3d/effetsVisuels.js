// Effets visuels : zones annoncées au sol (attaques des monstres), anneaux,
// traînées de coup, éclats de particules et projectiles.
import * as THREE from 'three';

export function creerEffetsVisuels(scene) {
  const actifs = [];

  function ajouter(objet, duree, mise) {
    scene.add(objet);
    actifs.push({ objet, duree, temps: 0, mise });
    return objet;
  }

  function materiauTransparent(couleur, opacite) {
    return new THREE.MeshBasicMaterial({
      color: couleur, transparent: true, opacity: opacite, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
  }

  // Zone rouge au sol pendant le temps d'annonce d'une attaque de monstre.
  // forme : 'cone' | 'cercle' | 'ligne'
  function telegraphe(forme, portee, angle = Math.PI / 2) {
    let geometrie;
    if (forme === 'cercle') geometrie = new THREE.CircleGeometry(portee, 32);
    else if (forme === 'ligne') {
      geometrie = new THREE.PlaneGeometry(1.4, portee);
      geometrie.translate(0, portee / 2, 0);
    } else geometrie = new THREE.CircleGeometry(portee, 24, Math.PI / 2 - angle / 2, angle);
    geometrie.rotateX(-Math.PI / 2);
    // Après rotation, l'avant de la forme est vers -z ; on la retourne vers +z.
    geometrie.rotateY(Math.PI);
    const maillage = new THREE.Mesh(geometrie, materiauTransparent(0xff2a1a, 0.15));
    maillage.renderOrder = 2;
    scene.add(maillage);
    return {
      maillage,
      placer(position, orientation, sol) {
        maillage.position.set(position.x, sol + 0.08, position.z);
        maillage.rotation.y = orientation;
      },
      progression(t) {
        maillage.material.opacity = 0.15 + t * 0.4;
      },
      retirer() {
        scene.remove(maillage);
        maillage.geometry.dispose();
        maillage.material.dispose();
      },
    };
  }

  // Anneau qui s'élargit (zones, soins, explosions).
  function anneau(position, rayon, couleur, duree = 0.45) {
    const geometrie = new THREE.RingGeometry(0.7, 1, 40);
    geometrie.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geometrie, materiauTransparent(couleur, 0.7));
    m.position.copy(position).y += 0.15;
    ajouter(m, duree, (t) => {
      m.scale.setScalar(0.2 + rayon * t);
      m.material.opacity = 0.7 * (1 - t);
    });
  }

  // Arc de coup d'arme devant le héros.
  function arc(position, orientation, portee, angle, couleur) {
    const geometrie = new THREE.RingGeometry(portee * 0.45, portee, 24, 1, Math.PI / 2 - angle / 2, angle);
    geometrie.rotateX(-Math.PI / 2);
    geometrie.rotateY(Math.PI);
    const m = new THREE.Mesh(geometrie, materiauTransparent(couleur, 0.55));
    m.position.copy(position).y += 1.0;
    m.rotation.y = orientation;
    ajouter(m, 0.2, (t) => { m.material.opacity = 0.55 * (1 - t); });
  }

  // Petit éclat de particules (impacts).
  const geoEclat = new THREE.TetrahedronGeometry(0.09);
  function eclat(position, couleur, nombre = 8) {
    const groupe = new THREE.Group();
    const materiau = new THREE.MeshBasicMaterial({ color: couleur, transparent: true });
    const vitesses = [];
    for (let i = 0; i < nombre; i++) {
      const p = new THREE.Mesh(geoEclat, materiau);
      groupe.add(p);
      vitesses.push(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).multiplyScalar(6));
    }
    groupe.position.copy(position);
    ajouter(groupe, 0.4, (t, dt) => {
      groupe.children.forEach((p, i) => {
        vitesses[i].y -= 18 * dt;
        p.position.addScaledVector(vitesses[i], dt);
        p.rotation.x += dt * 8;
      });
      materiau.opacity = 1 - t;
    });
  }

  // Colonne de lumière (soin).
  function colonne(position, couleur) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3, 16, 1, true), materiauTransparent(couleur, 0.4));
    m.position.copy(position).y += 1.5;
    ajouter(m, 0.7, (t) => {
      m.material.opacity = 0.4 * (1 - t);
      m.scale.set(1 - t * 0.5, 1 + t, 1 - t * 0.5);
    });
  }

  // Racines qui sortent du sol.
  function pics(position, rayon, couleur) {
    const groupe = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: couleur, flatShading: true });
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * rayon;
      const pic = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.2, 5), mat);
      pic.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      pic.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      groupe.add(pic);
    }
    groupe.position.copy(position);
    ajouter(groupe, 1.2, (t) => {
      const montee = Math.min(1, t * 5);
      groupe.children.forEach((p) => { p.scale.y = montee; p.position.y = 0.6 * montee - 0.6 + (t > 0.7 ? -(t - 0.7) * 2 : 0); });
    });
  }

  function creerProjectile(couleur, forme) {
    let m;
    if (forme === 'fleche') {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: couleur }));
    } else {
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color: couleur }));
      const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), materiauTransparent(couleur, 0.3));
      m.add(halo);
    }
    scene.add(m);
    return m;
  }

  function retirer(objet) {
    scene.remove(objet);
    objet.traverse?.((o) => { o.geometry?.dispose?.(); });
  }

  function mettreAJour(dt) {
    for (let i = actifs.length - 1; i >= 0; i--) {
      const a = actifs[i];
      a.temps += dt;
      const t = Math.min(1, a.temps / a.duree);
      a.mise?.(t, dt);
      if (t >= 1) {
        retirer(a.objet);
        actifs.splice(i, 1);
      }
    }
  }

  function vider() {
    for (const a of actifs) retirer(a.objet);
    actifs.length = 0;
  }

  return { telegraphe, anneau, arc, eclat, colonne, pics, creerProjectile, retirer, mettreAJour, vider };
}
