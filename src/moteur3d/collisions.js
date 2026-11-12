// Collisions simples et robustes, sans moteur physique :
// - obstacles « cercle » (arbres, rochers, tour) et « boîte » orientée (maisons, murs, grilles) ;
// - sols surélevés (plateformes de la tour, ponts) sur lesquels on peut marcher ;
// - le relief du terrain.
// Les obstacles sont rangés dans une grille pour ne tester que ceux qui sont proches.

const TAILLE_CASE = 12;

export function creerCollisions(terrain) {
  const grille = new Map();
  const sols = [];
  const limite = terrain.demi - 6;
  const cle = (cx, cz) => `${cx},${cz}`;

  function casesDe(o) {
    const etendue = o.type === 'boite' ? Math.hypot(o.demiL, o.demiP) : o.r;
    const x0 = Math.floor((o.x - etendue) / TAILLE_CASE), x1 = Math.floor((o.x + etendue) / TAILLE_CASE);
    const z0 = Math.floor((o.z - etendue) / TAILLE_CASE), z1 = Math.floor((o.z + etendue) / TAILLE_CASE);
    const liste = [];
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) liste.push(cle(cx, cz));
    return liste;
  }

  // o : { type: 'cercle', x, z, r, h } ou { type: 'boite', x, z, demiL, demiP, angle, h }
  // h : hauteur de l'obstacle au-dessus de sa base (base = sol à sa position si absente).
  function ajouterObstacle(o) {
    o.type = o.type || 'cercle';
    if (o.base === undefined) o.base = terrain.hauteur(o.x, o.z);
    if (o.type === 'boite') {
      o.cos = Math.cos(o.angle || 0);
      o.sin = Math.sin(o.angle || 0);
    }
    for (const k of casesDe(o)) {
      if (!grille.has(k)) grille.set(k, new Set());
      grille.get(k).add(o);
    }
    return o;
  }

  function retirerObstacle(o) {
    for (const k of casesDe(o)) grille.get(k)?.delete(o);
  }

  function obstaclesProches(x, z) {
    const cx = Math.floor(x / TAILLE_CASE), cz = Math.floor(z / TAILLE_CASE);
    const vus = new Set();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cellule = grille.get(cle(cx + dx, cz + dz));
        if (cellule) for (const o of cellule) vus.add(o);
      }
    }
    return vus;
  }

  // Repousse la position (x, z) hors des obstacles qui sont à sa hauteur.
  function resoudre(position, rayon) {
    for (const o of obstaclesProches(position.x, position.z)) {
      const y = position.y ?? o.base;
      if (y > o.base + o.h - 0.2 || y < o.base - 3) continue; // au-dessus (ou loin en dessous)
      if (o.type === 'boite') {
        // Coordonnées locales de la boîte.
        const dx = position.x - o.x, dz = position.z - o.z;
        const lx = dx * o.cos - dz * o.sin;
        const lz = dx * o.sin + dz * o.cos;
        const px = o.demiL + rayon - Math.abs(lx);
        const pz = o.demiP + rayon - Math.abs(lz);
        if (px > 0 && pz > 0) {
          let nx = lx, nz = lz;
          if (px < pz) nx = Math.sign(lx || 1) * (o.demiL + rayon);
          else nz = Math.sign(lz || 1) * (o.demiP + rayon);
          // Retour en coordonnées du monde.
          position.x = o.x + nx * o.cos + nz * o.sin;
          position.z = o.z - nx * o.sin + nz * o.cos;
        }
      } else {
        const dx = position.x - o.x, dz = position.z - o.z;
        const distance = Math.hypot(dx, dz);
        const minimum = rayon + o.r;
        if (distance < minimum) {
          if (distance < 0.0001) position.x += minimum;
          else {
            const pousse = (minimum - distance) / distance;
            position.x += dx * pousse;
            position.z += dz * pousse;
          }
        }
      }
    }
    position.x = Math.max(-limite, Math.min(limite, position.x));
    position.z = Math.max(-limite, Math.min(limite, position.z));
  }

  // Un point 3D est-il à l'intérieur d'un obstacle ? (projectiles)
  function estBloque(x, y, z) {
    for (const o of obstaclesProches(x, z)) {
      if (y < o.base || y > o.base + o.h) continue;
      if (o.type === 'boite') {
        const dx = x - o.x, dz = z - o.z;
        if (Math.abs(dx * o.cos - dz * o.sin) < o.demiL && Math.abs(dx * o.sin + dz * o.cos) < o.demiP) return true;
      } else if (Math.hypot(x - o.x, z - o.z) < o.r) return true;
    }
    return false;
  }

  // s : { type: 'disque', x, z, r, h } ou { type: 'boite', x, z, demiL, demiP, angle, h }
  // (h = altitude du dessus du sol). Un disque peut avoir un trou central (rInterieur).
  function ajouterSol(s) {
    if (s.type === 'boite') {
      s.cos = Math.cos(s.angle || 0);
      s.sin = Math.sin(s.angle || 0);
    }
    sols.push(s);
    return s;
  }

  function surSol(s, x, z) {
    if (s.type === 'boite') {
      const dx = x - s.x, dz = z - s.z;
      return Math.abs(dx * s.cos - dz * s.sin) <= s.demiL && Math.abs(dx * s.sin + dz * s.cos) <= s.demiP;
    }
    const d = Math.hypot(x - s.x, z - s.z);
    return d <= s.r && d >= (s.rInterieur || 0);
  }

  // Hauteur du sol sous un personnage à l'altitude y (terrain ou plateforme).
  function hauteurSol(x, z, y = Infinity) {
    let h = terrain.hauteur(x, z);
    for (const s of sols) {
      if (s.h > h && s.h <= y + 0.6 && surSol(s, x, z)) h = s.h;
    }
    return h;
  }

  function pente(x, z) {
    const e = 0.6;
    const gx = (terrain.hauteur(x + e, z) - terrain.hauteur(x - e, z)) / (2 * e);
    const gz = (terrain.hauteur(x, z + e) - terrain.hauteur(x, z - e)) / (2 * e);
    return Math.hypot(gx, gz);
  }

  return { resoudre, hauteur: terrain.hauteur, hauteurSol, pente, ajouterObstacle, retirerObstacle, obstaclesProches, estBloque, ajouterSol };
}
