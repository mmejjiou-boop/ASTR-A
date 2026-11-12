// Dialogue avec un PNJ : texte du personnage, choix libres (data/dialogues.json),
// quêtes à proposer ou à rendre, et accès à son service (boutique, banque…).
import { el } from './dom.js';
import { t } from '../core/textes.js';
import { emettre } from '../core/evenements.js';
import { ouvrirPanneau } from './panneau.js';

// ctx : { donnees, heros, quetes, ouvrirService(service, pnj) }
export function ouvrirDialogue(pnj, ctx) {
  const { donnees, quetes } = ctx;
  const def = pnj.def;
  const dialogue = donnees.dialogues.get(def.dialogue);
  let vue = { type: 'noeud', noeud: dialogue?.debut || 'accueil' };
  emettre('parler', { pnj: def.id });

  const titre = t(`pnj.${def.id}.nom`);
  const sousTitre = `pnj.${def.id}.titre` in donnees.textes ? t(`pnj.${def.id}.titre`) : '';

  const panneau = ouvrirPanneau({
    titre,
    sousTitre,
    classe: 'panneau-dialogue',
    construire(corps) {
      if (vue.type === 'quete') return afficherQuete(corps, vue.quete, vue.mode);
      const noeud = dialogue?.noeuds[vue.noeud];
      corps.append(el('p', { class: 'dialogue-texte' }, noeud ? t(noeud.texte) : ''));
      const choix = el('div', { class: 'dialogue-choix' });
      const ajouterChoix = (texte, action, classe = '') => choix.append(el('button', { class: `choix ${classe}`, onclick: action }, texte));

      if (vue.noeud === (dialogue?.debut || 'accueil')) {
        const q = quetes.pourPnj(def.id);
        for (const quete of q.aRendre) ajouterChoix(t('dialogue.rendre', { titre: t(`${quete.texte}.titre`) }), () => { vue = { type: 'quete', quete, mode: 'rendre' }; panneau.rafraichir(); }, 'choix-quete');
        for (const quete of q.aProposer) ajouterChoix(t('dialogue.proposer', { titre: t(`${quete.texte}.titre`) }), () => { vue = { type: 'quete', quete, mode: 'proposer' }; panneau.rafraichir(); }, 'choix-quete');
        for (const quete of q.enCours) ajouterChoix(t('dialogue.enCours', { titre: t(`${quete.texte}.titre`) }), () => { vue = { type: 'quete', quete, mode: 'suivi' }; panneau.rafraichir(); });
        if (def.service) ajouterChoix(t(`service.${def.service}`), () => ctx.ouvrirService(def.service, pnj), 'choix-service');
      }
      for (const c of noeud?.choix || []) {
        ajouterChoix(t(c.texte), () => {
          if (c.fin) return panneau.fermer();
          vue = { type: 'noeud', noeud: c.suite };
          panneau.rafraichir();
        });
      }
      ajouterChoix(t('dialogue.fermer'), () => panneau.fermer(), 'choix-fin');
      corps.append(choix);
    },
  });

  function retour() {
    vue = { type: 'noeud', noeud: dialogue?.debut || 'accueil' };
    panneau.rafraichir();
  }

  function afficherQuete(corps, quete, mode) {
    corps.append(
      el('div', { class: `etiquette categorie-${quete.categorie}` }, t(`categorie.${quete.categorie}`)),
      el('h3', { class: 'quete-titre' }, t(`${quete.texte}.titre`)),
      el('p', { class: 'dialogue-texte' }, mode === 'rendre' ? t(`${quete.texte}.fin`) : t(`${quete.texte}.resume`)),
    );
    if (mode !== 'rendre') corps.append(listeObjectifs(quete, quetes, mode === 'suivi'));
    corps.append(recompenses(quete, donnees));
    const boutons = el('div', { class: 'dialogue-choix' });
    if (mode === 'proposer') {
      boutons.append(
        el('button', { class: 'bouton principal', onclick: () => { quetes.accepter(quete.id); retour(); } }, t('dialogue.accepter')),
        el('button', { class: 'bouton discret', onclick: retour }, t('dialogue.refuser')),
      );
    } else if (mode === 'rendre') {
      boutons.append(el('button', { class: 'bouton principal', onclick: () => { quetes.rendre(quete.id); retour(); } }, t('dialogue.rendre', { titre: t(`${quete.texte}.titre`) })));
    } else {
      boutons.append(el('button', { class: 'bouton discret', onclick: retour }, t('commun.retour')));
    }
    corps.append(boutons);
  }
}

export function listeObjectifs(quete, quetes, avecProgres = true) {
  return el('ul', { class: 'objectifs' }, quete.objectifs.map((o, i) => {
    const max = o.quantite || 1;
    const n = avecProgres ? quetes.avancement(quete, i) : 0;
    const fini = avecProgres && n >= max;
    return el('li', { class: fini ? 'fini' : '' }, `${fini ? '✓ ' : '• '}${quetes.texteObjectif(o)}${max > 1 ? ` (${n}/${max})` : ''}`);
  }));
}

export function recompenses(quete, donnees) {
  const r = quete.recompenses || {};
  const morceaux = [];
  if (r.xp) morceaux.push(`${r.xp} XP`);
  if (r.or) morceaux.push(`${r.or} or`);
  for (const o of r.objets || []) morceaux.push(`${t(`objet.${o.id}.nom`)}${o.quantite > 1 ? ` ×${o.quantite}` : ''}`);
  return el('div', { class: 'recompenses' }, el('strong', {}, `${t('journal.recompenses')} : `), morceaux.join(' · '));
}
