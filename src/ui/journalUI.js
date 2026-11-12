// Journal de quêtes (touche J) et suivi des quêtes actives à l'écran.
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';
import { ecouter } from '../core/evenements.js';
import { ouvrirPanneau } from './panneau.js';
import { listeObjectifs, recompenses } from './dialogueUI.js';

export function ouvrirJournal(ctx) {
  const { quetes, donnees } = ctx;
  ouvrirPanneau({
    titre: t('journal.titre'),
    classe: 'panneau-journal',
    toucheFermer: 'KeyJ',
    construire(corps) {
      const actives = quetes.actives();
      corps.append(el('h3', {}, t('journal.actives')));
      if (!actives.length) corps.append(el('p', { class: 'note' }, t('journal.aucune')));
      for (const q of actives) {
        corps.append(el('div', { class: 'carte-quete' },
          el('div', { class: `etiquette categorie-${q.categorie}` }, t(`categorie.${q.categorie}`)),
          el('div', { class: 'nom' }, t(`${q.texte}.titre`)),
          el('p', { class: 'details' }, t(`${q.texte}.resume`)),
          listeObjectifs(q, quetes),
          el('div', { class: 'details' }, quetes.estFinie(q.id) ? t('journal.rendre', { nom: t(`pnj.${q.rendu}.nom`) }) : t('journal.donneur', { nom: t(`pnj.${q.donneur}.nom`) })),
          recompenses(q, donnees),
        ));
      }
      const terminees = quetes.terminees();
      if (terminees.length) {
        corps.append(el('h3', {}, `${t('journal.terminees')} (${terminees.length})`));
        corps.append(el('ul', { class: 'objectifs' }, terminees.map((q) => el('li', { class: 'fini' }, `✓ ${t(`${q.texte}.titre`)}`))));
      }
    },
  });
}

// Petit encadré à droite de l'écran : objectifs des quêtes en cours.
export function creerSuiviQuetes(quetes) {
  const racine = el('div', { class: 'suivi-quetes' });
  ui().append(racine);
  function rafraichir() {
    racine.replaceChildren();
    for (const q of quetes.actives().slice(0, 4)) {
      racine.append(el('div', { class: 'suivi' },
        el('div', { class: 'nom' }, `${quetes.estFinie(q.id) ? '✓ ' : ''}${t(`${q.texte}.titre`)}`),
        quetes.estFinie(q.id)
          ? el('div', { class: 'details' }, t('journal.rendre', { nom: t(`pnj.${q.rendu}.nom`) }))
          : listeObjectifs(q, quetes)));
    }
  }
  const arret = ecouter('quetesChangees', rafraichir);
  rafraichir();
  return {
    rafraichir,
    afficher(visible) { racine.hidden = !visible; },
    detruire() { arret(); racine.remove(); },
  };
}
