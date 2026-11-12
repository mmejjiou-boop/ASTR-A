// Fenêtres intégrées au jeu (remplacent alert/confirm, bloqués sur certains hébergements).
import { el, ui } from './dom.js';

function fenetre(contenu, boutons) {
  return new Promise((resoudre) => {
    const fond = el('div', { class: 'menu fenetre' });
    const boite = el('div', { class: 'menu-boite' }, contenu);
    const ligne = el('div', { class: 'fenetre-boutons' });
    for (const b of boutons) {
      ligne.append(el('button', {
        class: `bouton ${b.principal ? 'principal' : 'discret'}`,
        onclick: async () => {
          if (b.action) await b.action();
          if (b.garder) return;
          fond.remove();
          resoudre(b.valeur);
        },
      }, b.texte));
    }
    boite.append(ligne);
    fond.append(boite);
    ui().append(fond);
    ligne.querySelector('.principal')?.focus();
  });
}

export function confirmer(message, oui = 'Oui', non = 'Annuler') {
  return fenetre(el('p', {}, message), [
    { texte: non, valeur: false },
    { texte: oui, valeur: true, principal: true },
  ]);
}

export function informer(message, ok = 'OK') {
  return fenetre(el('p', {}, message), [{ texte: ok, valeur: true, principal: true }]);
}

// Affiche un texte à copier (sauvegarde) avec un bouton « Copier ».
export function texteACopier(titre, explication, texte) {
  const zone = el('textarea', { class: 'zone-copie', readonly: true, rows: '6' });
  zone.value = texte;
  const etat = el('div', { class: 'note' });
  return fenetre(el('div', {}, el('h2', {}, titre), el('p', { class: 'note' }, explication), zone, etat), [
    {
      texte: 'Copier',
      garder: true,
      action: async () => {
        try {
          await navigator.clipboard.writeText(texte);
          etat.textContent = 'Copié !';
        } catch {
          zone.select();
          etat.textContent = 'Sélectionne le texte et fais Ctrl+C.';
        }
      },
    },
    { texte: 'Fermer', valeur: true, principal: true },
  ]);
}
