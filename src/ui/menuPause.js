// Menu pause (Échap) : reprendre, exporter/importer la sauvegarde, options, écran titre.
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';

export function afficherPause({ options, surReprendre, surExporter, surImporter, surQuitter, surOptions }) {
  const boite = el('div', { class: 'menu-boite' });
  const menu = el('div', { class: 'menu' }, boite);

  function principal() {
    boite.replaceChildren(
      el('h2', {}, t('pause.titre')),
      el('button', { class: 'bouton principal', onclick: () => { fermer(); surReprendre(); } }, t('pause.reprendre')),
      el('button', { class: 'bouton', onclick: surExporter }, t('pause.exporter')),
      el('button', { class: 'bouton', onclick: () => surImporter(fermer) }, t('pause.importer')),
      el('button', { class: 'bouton', onclick: reglages }, t('pause.options')),
      el('button', { class: 'bouton', onclick: () => { fermer(); surQuitter(); } }, t('pause.quitter')),
    );
    boite.querySelector('.bouton').focus();
  }

  function reglages() {
    const valeur = el('span', {}, options.sensibiliteSouris.toFixed(1));
    const curseur = el('input', { type: 'range', min: '0.2', max: '3', step: '0.1', value: String(options.sensibiliteSouris) });
    curseur.addEventListener('input', () => {
      options.sensibiliteSouris = Number(curseur.value);
      valeur.textContent = options.sensibiliteSouris.toFixed(1);
      surOptions(options);
    });
    const caseY = el('input', { type: 'checkbox' });
    caseY.checked = options.inverserY;
    caseY.addEventListener('change', () => {
      options.inverserY = caseY.checked;
      surOptions(options);
    });
    const caseBloom = el('input', { type: 'checkbox' });
    caseBloom.checked = options.bloom !== false;
    caseBloom.addEventListener('change', () => {
      options.bloom = caseBloom.checked;
      surOptions(options);
    });
    boite.replaceChildren(
      el('h2', {}, t('pause.options')),
      el('label', {}, t('options.sensibilite'), el('span', {}, curseur, ' ', valeur)),
      el('label', {}, t('options.inverserY'), caseY),
      el('label', {}, t('options.bloom'), caseBloom),
      el('button', { class: 'bouton', onclick: principal }, t('options.retour')),
    );
  }

  function fermer() {
    menu.remove();
  }

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      fermer();
      surReprendre();
    }
  });
  ui().append(menu);
  principal();
  return { fermer };
}
