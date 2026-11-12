// Éléments HTML placés sur la 3D : barres de vie des monstres, marque de la cible,
// nombres de dégâts, messages en haut de l'écran.
import * as THREE from 'three';
import { el } from './dom.js';
import { t } from '../core/textes.js';
import { ecouter } from '../core/evenements.js';

export function creerSurcouche(camera) {
  const conteneur = document.getElementById('surcouche');
  const messages = el('div', { class: 'messages' });
  document.getElementById('ui').append(messages);
  const barres = new Map(); // uid du monstre → élément
  const marque = el('div', { class: 'marque-cible' });
  marque.hidden = true;
  conteneur.append(marque);
  const flottants = [];
  const v = new THREE.Vector3();
  const desabonnements = [];

  function versEcran(position) {
    v.copy(position).project(camera);
    if (v.z > 1) return null;
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }

  function flottant(position, texte, classe) {
    const element = el('div', { class: `flottant ${classe}` }, texte);
    conteneur.append(element);
    flottants.push({ element, position: position.clone(), temps: 0, decalage: (Math.random() - 0.5) * 30 });
  }

  function message(texte, grand = false) {
    if (!grand && [...messages.children].some((m) => m.textContent === texte)) return;
    const element = el('div', { class: `message${grand ? ' grand' : ''}` }, texte);
    messages.append(element);
    setTimeout(() => element.remove(), 2400);
  }

  desabonnements.push(
    ecouter('degats', (e) => flottant(e.position, String(e.montant), `${e.cible}${e.critique ? ' critique' : ''}`)),
    ecouter('soin', (e) => e.montant > 0 && flottant(e.position, `+${e.montant}`, 'soin')),
    ecouter('esquive', (e) => flottant(e.position, 'Esquive', 'info')),
    ecouter('bloque', (e) => flottant(e.position, t('msg.bloque'), 'info')),
    ecouter('effet', (e) => flottant(e.position, t(`effet.${e.id}`), 'info')),
    ecouter('monstreTue', (e) => {
      flottant(e.position, t('msg.xp', { n: e.xp }), 'xp');
      if (e.or > 0) message(t('msg.or', { n: e.or }));
    }),
    ecouter('niveau', (e) => message(t('msg.niveau', { n: e.niveau }), true)),
    ecouter('message', (e) => message(t(e.cle, e.valeurs))),
  );

  return {
    message,
    mettreAJour(dt, monde) {
      // Barres de vie : monstres blessés, en chasse ou ciblés, à moins de 40 m.
      const vus = new Set();
      for (const m of monde.monstres) {
        const visible = !m.mort && m.position.distanceTo(monde.heros.position) < 40
          && (m.vie < m.stats.vieMax || m.etat === 'poursuite' || monde.cible === m);
        if (!visible) continue;
        const p = versEcran(m.positionTete());
        if (!p) continue;
        vus.add(m.uid);
        let b = barres.get(m.uid);
        if (!b) {
          const remplissage = el('div', { class: 'remplissage' });
          b = {
            element: el('div', { class: 'barre-monstre' },
              el('div', { class: 'niveau' }, `${t('hud.niveau')} ${m.niveau}`),
              el('div', { class: 'barre vie' }, remplissage)),
            remplissage,
          };
          conteneur.append(b.element);
          barres.set(m.uid, b);
        }
        b.element.style.transform = `translate(${p.x}px, ${p.y}px) translateY(-100%)`;
        b.element.style.left = '0';
        b.element.style.top = '0';
        b.remplissage.style.width = `${(m.vie / m.stats.vieMax) * 100}%`;
        b.element.classList.toggle('cible', monde.cible === m);
      }
      for (const [uid, b] of barres) {
        if (!vus.has(uid)) {
          b.element.remove();
          barres.delete(uid);
        }
      }

      const c = monde.cible;
      const pc = c && versEcran(c.centre());
      marque.hidden = !pc;
      if (pc) marque.style.transform = `translate(${pc.x}px, ${pc.y}px) rotate(45deg)`;

      for (let i = flottants.length - 1; i >= 0; i--) {
        const f = flottants[i];
        f.temps += dt;
        const p = versEcran(f.position);
        if (!p || f.temps > 1) {
          f.element.remove();
          flottants.splice(i, 1);
          continue;
        }
        f.element.style.left = `${p.x + f.decalage}px`;
        f.element.style.top = `${p.y - f.temps * 50}px`;
        f.element.style.opacity = String(1 - Math.max(0, f.temps - 0.6) / 0.4);
      }
    },
    detruire() {
      desabonnements.forEach((d) => d());
      for (const b of barres.values()) b.element.remove();
      for (const f of flottants) f.element.remove();
      marque.remove();
      messages.remove();
    },
  };
}
