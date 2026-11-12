// Écran titre : « Nouvelle partie », « Continuer » (seulement si une sauvegarde existe)
// et « Importer une sauvegarde ».
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';
import { confirmer } from './dialogue.js';

export function afficherEcranTitre({ sauvegardeExiste, surNouvelle, surContinuer, surImporter }) {
  const boutonContinuer = sauvegardeExiste
    ? el('button', { class: 'bouton principal', onclick: () => { fermer(); surContinuer(); } }, t('titre.continuer'))
    : null;
  const ecran = el('div', { class: 'ecran ecran-titre' },
    el('h1', {}, t('jeu.titre')),
    el('p', { class: 'sous-titre' }, t('jeu.soustitre')),
    el('div', { class: 'boutons' },
      boutonContinuer,
      el('button', {
        class: sauvegardeExiste ? 'bouton' : 'bouton principal',
        onclick: async () => {
          if (sauvegardeExiste && !(await confirmer(t('titre.confirmerEcraser'), t('titre.nouvelle')))) return;
          fermer();
          surNouvelle();
        },
      }, t('titre.nouvelle')),
      el('button', { class: 'bouton', onclick: () => surImporter(fermer) }, t('titre.importer')),
    ),
    el('div', { class: 'version' }, t('titre.prototype')),
  );
  function fermer() {
    ecran.remove();
  }
  ui().append(ecran);
  (boutonContinuer || ecran.querySelector('.bouton'))?.focus();
  return { fermer };
}
