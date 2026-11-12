// Fenêtre générique du jeu (dialogue, boutique, inventaire, journal, carte…).
// Le jeu se met en pause et libère la souris tant qu'elle est ouverte.
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';

let gestionnaire = null; // fourni par le jeu : { ouverture(panneau), fermeture(panneau) }
let actuel = null;

export function configurerPanneaux(g) {
  gestionnaire = g;
}

export function panneauOuvert() {
  return actuel;
}

// options : { titre, sousTitre, classe, construire(corps, panneau), surFermer }
export function ouvrirPanneau(options) {
  actuel?.fermer(false);
  const corps = el('div', { class: 'panneau-corps' });
  const titre = el('h2', {}, options.titre || '');
  const sousTitre = el('div', { class: 'panneau-sous-titre' }, options.sousTitre || '');
  const boite = el('div', { class: `panneau ${options.classe || ''}` },
    el('div', { class: 'panneau-entete' },
      el('div', {}, titre, sousTitre),
      el('button', { class: 'panneau-fermer', title: t('commun.fermer'), onclick: () => panneau.fermer() }, '✕'),
    ),
    corps,
  );
  const fond = el('div', { class: 'panneau-fond' }, boite);
  fond.addEventListener('mousedown', (e) => { if (e.target === fond) panneau.fermer(); });

  const panneau = {
    corps,
    options,
    definirTitre(texte, sous = '') {
      titre.textContent = texte;
      sousTitre.textContent = sous;
    },
    rafraichir() {
      corps.replaceChildren();
      options.construire(corps, panneau);
    },
    // reprendre : faut-il recapturer la souris (faux quand on enchaîne sur un autre panneau).
    fermer(reprendre = true) {
      if (actuel !== panneau) return;
      actuel = null;
      fond.remove();
      document.removeEventListener('keydown', touche, true);
      options.surFermer?.();
      gestionnaire?.fermeture(panneau, reprendre);
    },
  };
  function touche(e) {
    if (e.key === 'Escape' || (options.toucheFermer && e.code === options.toucheFermer)) {
      e.preventDefault();
      e.stopPropagation();
      panneau.fermer();
    }
  }
  document.addEventListener('keydown', touche, true);
  ui().append(fond);
  actuel = panneau;
  gestionnaire?.ouverture(panneau);
  panneau.rafraichir();
  return panneau;
}
