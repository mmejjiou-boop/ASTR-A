// Animations calculées (procédurales) : pas de fichier d'animation.
// etat : { vitesse (m/s), temps, attaque (0→1 ou -1), blocage, roulade (0→1 ou -1), enAir, incantation }

export function animer(modele, etat) {
  const p = modele.userData.parties;
  if (!p) return;
  const base = modele.userData.hauteurCorps ?? 0.95;
  if (modele.userData.type === 'quadrupede') return animerQuadrupede(p, etat, base);
  if (modele.userData.type === 'insecte') return animerInsecte(p, etat);
  return animerHumanoide(p, etat, base);
}

function animerInsecte(p, e) {
  // Battement d'ailes rapide et léger flottement.
  const battement = Math.sin(e.temps * 60) * 0.6;
  p.ailes[0].rotation.z = battement;
  p.ailes[1].rotation.z = -battement;
  p.corps.position.y = Math.sin(e.temps * 3) * 0.12;
  p.corps.rotation.x = 0;
  if (e.attaque >= 0) {
    // L'abdomen se replie vers l'avant pour piquer.
    const t = e.attaque;
    p.abdomen.rotation.x = 0.35 + (t < 0.4 ? -0.3 * (t / 0.4) : 1.2 * Math.sin(((t - 0.4) / 0.6) * Math.PI));
  } else {
    p.abdomen.rotation.x = 0.35;
  }
}

function animerHumanoide(p, e, base) {
  const allure = Math.min(1, e.vitesse / 8);
  const cadence = e.temps * (6 + allure * 6);
  const balancier = Math.sin(cadence) * (0.15 + allure * 0.75) * (e.vitesse > 0.2 ? 1 : 0);

  p.jambeG.rotation.x = balancier;
  p.jambeD.rotation.x = -balancier;
  p.brasG.rotation.set(-balancier * 0.8, 0, 0);
  p.brasD.rotation.set(balancier * 0.8, 0, 0);
  p.corps.rotation.set(allure * 0.12 + (e.penche || 0), 0, 0);
  p.corps.position.y = base + Math.abs(Math.sin(cadence)) * 0.06 * allure;
  if (p.tete) p.tete.rotation.set(0, 0, 0);

  // Respiration au repos.
  if (e.vitesse < 0.2) p.corps.position.y = base + Math.sin(e.temps * 2) * 0.012;

  if (e.enAir) {
    p.jambeG.rotation.x = -0.5;
    p.jambeD.rotation.x = 0.3;
    p.brasG.rotation.x = -0.9;
    p.brasD.rotation.x = -0.9;
  }

  if (e.escalade !== null && e.escalade !== undefined) {
    // Escalade : bras et jambes alternés contre la paroi.
    const m = Math.sin(e.escalade);
    p.brasG.rotation.set(-2.6 + m * 0.4, 0, 0);
    p.brasD.rotation.set(-2.6 - m * 0.4, 0, 0);
    p.jambeG.rotation.x = -0.6 - m * 0.4;
    p.jambeD.rotation.x = -0.6 + m * 0.4;
    p.corps.rotation.x = -0.15;
    return;
  }

  if (e.blocage) {
    p.brasG.rotation.set(-1.4, 0, -0.5);
    p.brasD.rotation.set(-1.1, 0, 0.4);
  }

  if (e.incantation > 0) {
    // Bras tendus vers l'avant pour lancer un sort.
    const t = Math.sin(e.incantation * Math.PI);
    p.brasD.rotation.set(-1.5 * t, 0, 0);
    p.brasG.rotation.set(-1.3 * t, 0, 0);
  } else if (e.attaque >= 0) {
    // Coup de taille : armer (0 → 0,35) puis frapper.
    const t = e.attaque;
    const armer = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
    const frapper = t < 0.35 ? 0 : Math.sin(((t - 0.35) / 0.65) * Math.PI);
    p.brasD.rotation.set(-2.4 * armer - 0.6 * frapper, 0, -0.9 * frapper);
    p.corps.rotation.y = 0.5 * armer - 0.6 * frapper;
  }

  if (e.roulade >= 0) {
    // Le corps fait un tour complet vers l'avant.
    p.corps.rotation.x = e.roulade * Math.PI * 2;
    p.corps.position.y = base * 0.58 + Math.sin(e.roulade * Math.PI) * 0.15;
    p.jambeG.rotation.x = p.jambeD.rotation.x = -1.2;
    p.brasG.rotation.x = p.brasD.rotation.x = -1.5;
  }
}

function animerQuadrupede(p, e, base) {
  const allure = Math.min(1, e.vitesse / 7);
  const cadence = e.temps * (5 + allure * 9);
  const amplitude = (0.2 + allure * 0.6) * (e.vitesse > 0.2 ? 1 : 0);
  p.pattes[0].rotation.x = Math.sin(cadence) * amplitude;
  p.pattes[3].rotation.x = Math.sin(cadence) * amplitude;
  p.pattes[1].rotation.x = -Math.sin(cadence) * amplitude;
  p.pattes[2].rotation.x = -Math.sin(cadence) * amplitude;
  p.corps.position.y = base + Math.abs(Math.sin(cadence)) * 0.05 * allure;
  p.queue.rotation.y = Math.sin(e.temps * 6) * 0.3;
  p.tete.rotation.x = 0;
  p.corps.rotation.x = 0;
  if (e.attaque >= 0) {
    // Recule la tête puis mord vers l'avant.
    const t = e.attaque;
    p.tete.rotation.x = t < 0.4 ? -0.5 * (t / 0.4) : 0.4 * Math.sin(((t - 0.4) / 0.6) * Math.PI);
    p.corps.rotation.x = t < 0.4 ? -0.15 * (t / 0.4) : 0.1;
  }
}
