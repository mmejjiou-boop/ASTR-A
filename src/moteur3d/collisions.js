// Collisions simples et robustes : un cercle (la base de la capsule du héros
// ou d'un monstre) contre les obstacles ronds et les limites de la carte.

export function creerCollisions(terrain) {
  const limite = terrain.demi - 8;

  // Repousse la position hors des obstacles. Modifie position (x, z).
  function resoudre(position, rayon) {
    for (const o of terrain.obstaclesProches(position.x, position.z)) {
      // Un obstacle bas peut être enjambé en sautant par-dessus.
      if (position.y > terrain.hauteur(o.x, o.z) + o.h) continue;
      const dx = position.x - o.x;
      const dz = position.z - o.z;
      const distance = Math.hypot(dx, dz);
      const minimum = rayon + o.r;
      if (distance < minimum) {
        if (distance < 0.0001) {
          position.x += minimum;
        } else {
          const pousse = (minimum - distance) / distance;
          position.x += dx * pousse;
          position.z += dz * pousse;
        }
      }
    }
    position.x = Math.max(-limite, Math.min(limite, position.x));
    position.z = Math.max(-limite, Math.min(limite, position.z));
  }

  // Pente du sol (0 = plat) : empêche de grimper les falaises en marchant.
  function pente(x, z) {
    const e = 0.6;
    const gx = (terrain.hauteur(x + e, z) - terrain.hauteur(x - e, z)) / (2 * e);
    const gz = (terrain.hauteur(x, z + e) - terrain.hauteur(x, z - e)) / (2 * e);
    return Math.hypot(gx, gz);
  }

  return { resoudre, hauteur: terrain.hauteur, pente };
}
