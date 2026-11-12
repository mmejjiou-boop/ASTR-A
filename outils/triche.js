// Outil de test : visible seulement avec ?debug=1 dans l'adresse.
// Sert aux « tests de fin » (passer des niveaux, gagner de l'or…). Jamais affiché aux joueurs.
import { el, ui } from '../src/ui/dom.js';
import { t } from '../src/core/textes.js';

export function debugActif() {
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

export function creerTriche(jeu) {
  const fps = el('span', {}, '…');
  const position = el('span', {}, '');
  const panneau = el('div', { class: 'debug' },
    el('strong', {}, t('debug.titre')),
    el('div', {}, 'FPS : ', fps),
    el('div', {}, position),
    el('button', { onclick: () => jeu.heros.gagnerXP(jeu.heros.xpSuivant - jeu.heros.xp) }, t('debug.xp')),
    el('button', { onclick: () => jeu.heros.gagnerOr(100) }, t('debug.or')),
    el('button', {
      onclick: () => {
        jeu.heros.vie = jeu.heros.stats.vieMax;
        jeu.heros.mana = jeu.heros.stats.manaMax;
      },
    }, t('debug.soin')),
    el('button', {
      onclick: () => {
        for (const m of [...jeu.monde.monstres]) {
          if (!m.mort && m.position.distanceTo(jeu.heros.position) < 30) jeu.monde.tuerMonstre(m);
        }
      },
    }, t('debug.tuer')),
  );
  ui().append(panneau);

  // Images par seconde mesurées en temps réel (pas avec le dt plafonné du jeu).
  let images = 0, temps = 0, precedent = performance.now();
  return {
    mettreAJour() {
      const maintenant = performance.now();
      temps += (maintenant - precedent) / 1000;
      precedent = maintenant;
      images++;
      if (temps >= 0.5) {
        fps.textContent = Math.round(images / temps);
        images = 0;
        temps = 0;
        const p = jeu.heros.position;
        position.textContent = `x ${p.x.toFixed(0)} · z ${p.z.toFixed(0)} · y ${p.y.toFixed(1)}`;
      }
    },
    detruire() {
      panneau.remove();
    },
  };
}
