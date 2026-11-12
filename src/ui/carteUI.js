// Carte du monde : mini-carte (coin de l'écran) et grande carte (touche M).
// Le brouillard cache tout ce que le héros n'a pas vu. Une tour activée révèle la région.
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';
import { ecouter } from '../core/evenements.js';
import { ouvrirPanneau } from './panneau.js';
import { confirmer } from './dialogue.js';
import * as THREE from 'three';

const TAILLE_IMAGE = 256;
const COULEUR_BROUILLARD = '#d8cfba';

// Image du relief (une fois par monde) : couleurs du terrain + ombrage des pentes.
function imageTerrain(monde) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TAILLE_IMAGE;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(TAILLE_IMAGE, TAILLE_IMAGE);
  const { terrain } = monde;
  const pas = terrain.taille / TAILLE_IMAGE;
  const c = new THREE.Color();
  const eau = new THREE.Color(monde.def.terrain.palette.eau);
  for (let j = 0; j < TAILLE_IMAGE; j++) {
    for (let i = 0; i < TAILLE_IMAGE; i++) {
      const x = -terrain.demi + (i + 0.5) * pas, z = -terrain.demi + (j + 0.5) * pas;
      const h = terrain.hauteur(x, z);
      if (h < terrain.niveauEau) c.copy(eau);
      else terrain.couleur(x, z, h, c);
      // Ombrage : lumière venant du nord-ouest.
      const ombre = Math.max(-0.25, Math.min(0.25, (terrain.hauteur(x - pas, z - pas) - h) * 0.04));
      const k = (j * TAILLE_IMAGE + i) * 4;
      image.data[k] = Math.min(255, (c.r + ombre) * 255);
      image.data[k + 1] = Math.min(255, (c.g + ombre) * 255);
      image.data[k + 2] = Math.min(255, (c.b + ombre) * 255);
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

// Masque du brouillard (cases non révélées opaques).
function masqueBrouillard(progression, monde, canvas) {
  const grille = progression.donnees.config.brouillard.grille;
  canvas.width = canvas.height = grille;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(grille, grille);
  const fond = new THREE.Color(COULEUR_BROUILLARD);
  for (let j = 0; j < grille; j++) {
    for (let i = 0; i < grille; i++) {
      const k = (j * grille + i) * 4;
      image.data[k] = fond.r * 255;
      image.data[k + 1] = fond.g * 255;
      image.data[k + 2] = fond.b * 255;
      image.data[k + 3] = progression.estRevele(monde.def.id, i, j) ? 0 : 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

// ctx : { monde(), progression, heros, quetes, ciblesQuetes(), destinations(), voyager(dest), donnees }
export function creerCartes(ctx) {
  const mini = el('canvas', { class: 'mini-carte', width: '180', height: '180' });
  const nomRegion = el('div', { class: 'mini-carte-nom' });
  const cadre = el('div', { class: 'mini-carte-cadre' }, mini, nomRegion);
  ui().append(cadre);
  let cacheMonde = null, terrainImage = null;
  const brouillard = document.createElement('canvas');
  let brouillardAJour = false;
  const arrets = [ecouter('brouillard', () => { brouillardAJour = false; }), ecouter('tourActivee', () => { brouillardAJour = false; })];

  function preparer() {
    const monde = ctx.monde();
    if (!monde || monde.estDonjon) return null;
    if (cacheMonde !== monde) {
      cacheMonde = monde;
      terrainImage = imageTerrain(monde);
      brouillardAJour = false;
      nomRegion.textContent = t(monde.def.texte);
    }
    if (!brouillardAJour) {
      masqueBrouillard(ctx.progression, monde, brouillard);
      brouillardAJour = true;
    }
    return monde;
  }

  // Marqueurs visibles sur la carte.
  function marqueurs(monde) {
    const carte = ctx.progression.carteDe(monde.def.id);
    const tourActive = monde.points.tour && carte.toursActivees.includes(monde.points.tour.id);
    const revele = (x, z) => {
      const grille = ctx.donnees.config.brouillard.grille;
      const i = Math.floor((x + monde.terrain.demi) / monde.terrain.taille * grille);
      const j = Math.floor((z + monde.terrain.demi) / monde.terrain.taille * grille);
      return ctx.progression.estRevele(monde.def.id, i, j);
    };
    const liste = [];
    const p = monde.points;
    if (p.village && revele(p.village.x, p.village.z)) liste.push({ type: 'village', x: p.village.x, z: p.village.z, nom: t(p.village.texte) });
    // La tour est visible de loin : toujours sur la carte.
    if (p.tour) liste.push({ type: tourActive ? 'tourActive' : 'tour', x: p.tour.x, z: p.tour.z, nom: t(p.tour.texte) });
    for (const d of p.donjons) if (revele(d.x, d.z)) liste.push({ type: 'donjon', x: d.x, z: d.z, nom: t(ctx.donnees.donjons.get(d.id).texte) });
    for (const l of p.lieux) if (carte.lieuxVisites.includes(l.id)) liste.push({ type: 'lieu', x: l.x, z: l.z, nom: t(`lieu.${l.id}`) });
    for (const c of p.coffres) {
      if (ctx.progression.coffresOuverts.has(c.id)) continue;
      if ((tourActive && c.visibleDeLoin) || Math.hypot(c.x - ctx.heros.position.x, c.z - ctx.heros.position.z) < 40) liste.push({ type: 'coffre', x: c.x, z: c.z });
    }
    for (const c of ctx.ciblesQuetes()) liste.push({ type: 'quete', x: c.x, z: c.z, nom: c.nom });
    return liste;
  }

  function dessinerMarqueur(g, m, x, y, echelle = 1) {
    g.save();
    g.translate(x, y);
    g.scale(echelle, echelle);
    g.lineWidth = 1.5;
    g.strokeStyle = '#2a2016';
    switch (m.type) {
      case 'village':
        g.fillStyle = '#c0392b';
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -7); g.lineTo(6, 0); g.lineTo(6, 6); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
        break;
      case 'tour':
      case 'tourActive':
        g.fillStyle = m.type === 'tourActive' ? '#3fd6ff' : '#8a8f96';
        g.beginPath(); g.moveTo(0, -9); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.stroke();
        break;
      case 'donjon':
        g.fillStyle = '#5a2a6a';
        g.beginPath(); g.arc(0, 0, 6, Math.PI, 0); g.lineTo(6, 5); g.lineTo(-6, 5); g.closePath(); g.fill(); g.stroke();
        break;
      case 'coffre':
        g.fillStyle = '#d4af37';
        g.fillRect(-4, -3, 8, 6); g.strokeRect(-4, -3, 8, 6);
        break;
      case 'lieu':
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill(); g.stroke();
        break;
      case 'quete':
        g.fillStyle = '#ffd23a';
        g.beginPath(); g.moveTo(0, -7); g.lineTo(6, 0); g.lineTo(0, 7); g.lineTo(-6, 0); g.closePath(); g.fill(); g.stroke();
        break;
      default:
    }
    g.restore();
  }

  function dessinerJoueur(g, x, y, orientation, taille = 8) {
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI - orientation);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#1a2236';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -taille); g.lineTo(taille * 0.7, taille * 0.7); g.lineTo(0, taille * 0.3); g.lineTo(-taille * 0.7, taille * 0.7); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }

  let chrono = 0;
  function mettreAJourMini(dt) {
    chrono -= dt;
    if (chrono > 0) return;
    chrono = 0.1;
    const monde = preparer();
    cadre.hidden = !monde;
    if (!monde) return;
    const g = mini.getContext('2d');
    const taille = mini.width;
    const vue = 320; // mètres affichés
    const { heros } = ctx;
    const echelle = taille / vue;
    const versImage = TAILLE_IMAGE / monde.terrain.taille;
    g.save();
    g.clearRect(0, 0, taille, taille);
    g.beginPath(); g.arc(taille / 2, taille / 2, taille / 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = COULEUR_BROUILLARD;
    g.fillRect(0, 0, taille, taille);
    const sx = (heros.position.x - vue / 2 + monde.terrain.demi) * versImage;
    const sz = (heros.position.z - vue / 2 + monde.terrain.demi) * versImage;
    g.imageSmoothingEnabled = true;
    g.drawImage(terrainImage, sx, sz, vue * versImage, vue * versImage, 0, 0, taille, taille);
    const versGrille = brouillard.width / monde.terrain.taille;
    g.drawImage(brouillard, (heros.position.x - vue / 2 + monde.terrain.demi) * versGrille, (heros.position.z - vue / 2 + monde.terrain.demi) * versGrille, vue * versGrille, vue * versGrille, 0, 0, taille, taille);
    for (const m of marqueurs(monde)) {
      let x = (m.x - heros.position.x) * echelle + taille / 2;
      let y = (m.z - heros.position.z) * echelle + taille / 2;
      const d = Math.hypot(x - taille / 2, y - taille / 2);
      if (d > taille / 2 - 8) {
        if (m.type !== 'quete' && m.type !== 'tourActive' && m.type !== 'tour') continue;
        // Quêtes et tours hors de vue : flèche sur le bord.
        x = taille / 2 + (x - taille / 2) / d * (taille / 2 - 8);
        y = taille / 2 + (y - taille / 2) / d * (taille / 2 - 8);
      }
      dessinerMarqueur(g, m, x, y, 0.85);
    }
    dessinerJoueur(g, taille / 2, taille / 2, heros.orientation, 7);
    g.restore();
    g.strokeStyle = '#9c7b2c';
    g.lineWidth = 3;
    g.beginPath(); g.arc(taille / 2, taille / 2, taille / 2 - 1.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#f2eee4';
    g.font = 'bold 12px system-ui';
    g.textAlign = 'center';
    g.fillText('N', taille / 2, 14);
  }

  function ouvrirGrandeCarte() {
    const monde = preparer();
    ouvrirPanneau({
      titre: monde ? t('carte.titre', { monde: t(monde.def.texte) }) : t('carte.titre', { monde: '' }),
      classe: 'panneau-carte',
      toucheFermer: 'KeyM',
      construire(corps, panneau) {
        if (!monde) {
          corps.append(el('p', {}, t('carte.donjon')));
          return;
        }
        const taille = Math.min(720, window.innerHeight - 190, window.innerWidth - 120);
        const canvas = el('canvas', { width: String(taille), height: String(taille), class: 'grande-carte' });
        const g = canvas.getContext('2d');
        const echelle = taille / monde.terrain.taille;
        const versEcran = (x, z) => [(x + monde.terrain.demi) * echelle, (z + monde.terrain.demi) * echelle];
        g.drawImage(terrainImage, 0, 0, taille, taille);
        g.imageSmoothingEnabled = true;
        g.drawImage(brouillard, 0, 0, taille, taille);
        const liste = marqueurs(monde);
        g.font = '12px system-ui';
        g.textAlign = 'center';
        for (const m of liste) {
          const [x, y] = versEcran(m.x, m.z);
          dessinerMarqueur(g, m, x, y, 1.15);
          if (m.nom && m.type !== 'quete' && m.type !== 'lieu') {
            g.fillStyle = '#1a1410';
            g.fillText(m.nom, x, y - 12);
          }
        }
        const [hx, hy] = versEcran(ctx.heros.position.x, ctx.heros.position.z);
        dessinerJoueur(g, hx, hy, ctx.heros.orientation, 10);

        // Clic sur une destination connue : voyage rapide.
        const destinations = ctx.destinations();
        canvas.addEventListener('click', async (e) => {
          const r = canvas.getBoundingClientRect();
          const cx = (e.clientX - r.left) * (canvas.width / r.width), cy = (e.clientY - r.top) * (canvas.height / r.height);
          const choix = destinations.find((d) => {
            const [x, y] = versEcran(d.x, d.z);
            return Math.hypot(x - cx, y - cy) < 14;
          });
          if (choix && await confirmer(t('carte.voyagerVers', { nom: choix.nom }), 'Voyager')) {
            panneau.fermer();
            ctx.voyager(choix);
          }
        });
        // Infobulle : nom du lieu sous la souris.
        const info = el('div', { class: 'carte-info' }, t('carte.legende'));
        canvas.addEventListener('mousemove', (e) => {
          const r = canvas.getBoundingClientRect();
          const cx = (e.clientX - r.left) * (canvas.width / r.width), cy = (e.clientY - r.top) * (canvas.height / r.height);
          const proche = liste.find((m) => {
            const [x, y] = versEcran(m.x, m.z);
            return Math.hypot(x - cx, y - cy) < 10 && m.nom;
          });
          info.textContent = proche ? proche.nom : t('carte.legende');
          canvas.style.cursor = destinations.some((d) => {
            const [x, y] = versEcran(d.x, d.z);
            return Math.hypot(x - cx, y - cy) < 14;
          }) ? 'pointer' : 'default';
        });
        const legende = el('div', { class: 'carte-legende' },
          ...[['village', 'carte.legendeVillage'], ['tourActive', 'carte.legendeTour'], ['donjon', 'carte.legendeDonjon'], ['coffre', 'carte.legendeCoffre'], ['lieu', 'carte.legendeLieu'], ['quete', 'carte.legendeQuete']].map(([type, cle]) => {
            const c = el('canvas', { width: '20', height: '20' });
            dessinerMarqueur(c.getContext('2d'), { type }, 10, 10, 0.9);
            return el('span', {}, c, t(cle));
          }));
        corps.append(el('div', { class: 'carte-zone' }, canvas), info, legende);
      },
    });
  }

  return {
    mettreAJour: mettreAJourMini,
    ouvrirGrandeCarte,
    afficher(visible) { cadre.hidden = !visible; },
    detruire() {
      arrets.forEach((a) => a());
      cadre.remove();
    },
  };
}
