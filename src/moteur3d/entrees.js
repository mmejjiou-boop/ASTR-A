// Clavier et souris. On utilise la position physique des touches (event.code) :
// ZQSD sur un clavier AZERTY et WASD sur un clavier QWERTY marchent pareil.

export function creerEntrees(canvas) {
  const touches = new Set();
  const appuisDuTour = new Set();
  const souris = { dx: 0, dy: 0, molette: 0, gauche: false, droite: false, clicGauche: false, clicMilieu: false };
  let verrouille = false;
  let actif = true;
  const surVerrouillage = new Set();

  window.addEventListener('keydown', (e) => {
    if (!actif) return;
    if (e.code === 'Tab') e.preventDefault();
    if (!touches.has(e.code)) appuisDuTour.add(e.code);
    touches.add(e.code);
  });
  window.addEventListener('keyup', (e) => touches.delete(e.code));
  window.addEventListener('blur', () => {
    touches.clear();
    souris.gauche = souris.droite = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!actif) return;
    if (!verrouille) {
      canvas.requestPointerLock();
      return;
    }
    if (e.button === 0) { souris.gauche = true; souris.clicGauche = true; }
    if (e.button === 1) { souris.clicMilieu = true; e.preventDefault(); }
    if (e.button === 2) souris.droite = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) souris.gauche = false;
    if (e.button === 2) souris.droite = false;
  });
  window.addEventListener('mousemove', (e) => {
    if (!verrouille) return;
    souris.dx += e.movementX;
    souris.dy += e.movementY;
  });
  canvas.addEventListener('wheel', (e) => {
    souris.molette += Math.sign(e.deltaY);
  }, { passive: true });

  document.addEventListener('pointerlockchange', () => {
    verrouille = document.pointerLockElement === canvas;
    if (!verrouille) {
      touches.clear();
      souris.gauche = souris.droite = false;
    }
    for (const f of surVerrouillage) f(verrouille);
  });

  return {
    souris,
    appuye: (code) => touches.has(code),
    // Vrai une seule fois, au moment où la touche est enfoncée.
    vientDAppuyer: (code) => appuisDuTour.has(code),
    get verrouille() { return verrouille; },
    verrouiller: () => canvas.requestPointerLock(),
    liberer: () => document.exitPointerLock(),
    surChangementVerrouillage: (f) => surVerrouillage.add(f),
    definirActif(valeur) {
      actif = valeur;
      if (!valeur) touches.clear();
    },
    // À appeler à la fin de chaque image.
    finDuTour() {
      appuisDuTour.clear();
      souris.dx = souris.dy = souris.molette = 0;
      souris.clicGauche = souris.clicMilieu = false;
    },
  };
}
