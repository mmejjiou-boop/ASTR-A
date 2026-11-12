// Générateur aléatoire avec graine (mulberry32) : même graine = même monde.
export function creerHasard(graine) {
  let a = graine >>> 0;
  const suivant = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    suivant,
    entre: (min, max) => min + suivant() * (max - min),
    entier: (min, max) => Math.floor(min + suivant() * (max - min + 1)),
    choisir: (liste) => liste[Math.floor(suivant() * liste.length)],
  };
}

// Bruit de valeur 2D lissé, pour le relief.
export function creerBruit(graine) {
  const hasard = creerHasard(graine);
  const taille = 256;
  const valeurs = new Float32Array(taille * taille);
  for (let i = 0; i < valeurs.length; i++) valeurs[i] = hasard.suivant();
  const lisser = (t) => t * t * (3 - 2 * t);
  const valeur = (x, y) => valeurs[((y & 255) * taille) + (x & 255)];
  const bruit = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const tx = lisser(x - xi), ty = lisser(y - yi);
    const a = valeur(xi, yi), b = valeur(xi + 1, yi);
    const c = valeur(xi, yi + 1), d = valeur(xi + 1, yi + 1);
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  };
  // Plusieurs couches (octaves) pour un relief naturel. Résultat entre 0 et 1.
  return (x, y, octaves = 4) => {
    let total = 0, amplitude = 1, frequence = 1, somme = 0;
    for (let i = 0; i < octaves; i++) {
      total += bruit(x * frequence, y * frequence) * amplitude;
      somme += amplitude;
      amplitude *= 0.5;
      frequence *= 2;
    }
    return total / somme;
  };
}
