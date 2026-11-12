// Inventaire (touche I) : équipement porté, sac, statistiques.
import { el } from './dom.js';
import { t } from '../core/textes.js';
import { ouvrirPanneau } from './panneau.js';
import { EMPLACEMENTS, TAILLE_SAC, equiper, desequiper, utiliser, estEquipe, empechementEquiper } from '../systemes/inventaire.js';
import { STATS } from '../systemes/stats.js';

const NOMS_STATS = { attaque: 'Attaque', defense: 'Défense', vie: 'Vie', mana: 'Mana', force: 'Force', intelligence: 'Intelligence', agilite: 'Agilité', endurance: 'Endurance', chance: 'Chance' };

export function descriptionObjet(objet, donnees) {
  const morceaux = [];
  for (const [nom, valeur] of Object.entries(objet.stats || {})) morceaux.push(`${NOMS_STATS[nom] || nom} +${valeur}`);
  if (objet.effet?.soin) morceaux.push(`Rend ${objet.effet.soin} vie`);
  if (objet.effet?.mana) morceaux.push(`Rend ${objet.effet.mana} mana`);
  if (objet.emplacement) morceaux.push(t(`empl.${objet.emplacement === 'anneau' ? 'anneau1' : objet.emplacement}`).replace(' 1', ''));
  if ((objet.niveauRequis || 1) > 1) morceaux.push(`Niv. ${objet.niveauRequis}`);
  if (objet.type === 'quete') morceaux.push(t('inventaire.objetQuete'));
  if (objet.type === 'materiau') morceaux.push(`Se vend ${Math.floor(objet.prix * 0.4)} or`);
  return morceaux.join(' · ');
}

// ctx : { donnees, heros, sauvegarder }
export function ouvrirInventaire(ctx) {
  const { donnees, heros } = ctx;
  const panneau = ouvrirPanneau({
    titre: t('inventaire.titre'),
    classe: 'panneau-inventaire',
    toucheFermer: 'KeyI',
    construire(corps) {
      const equipement = el('div', { class: 'colonne' }, el('h3', {}, t('inventaire.equipement')));
      for (const emplacement of EMPLACEMENTS) {
        const objet = heros.objetEquipe(emplacement);
        equipement.append(el('div', { class: 'ligne-objet compacte' },
          el('div', {}, el('div', { class: 'details' }, t(`empl.${emplacement}`)), el('div', { class: 'nom' }, objet ? t(`${objet.texte}.nom`) : t('inventaire.vide'))),
          objet ? el('button', { class: 'bouton discret', onclick: () => { desequiper(heros, emplacement); ctx.sauvegarder(); panneau.rafraichir(); } }, t('inventaire.retirer')) : null,
        ));
      }

      const s = heros.stats;
      const stats = el('div', { class: 'stats-heros' },
        el('h3', {}, t('inventaire.stats')),
        ...STATS.map((nom) => el('div', { class: nom === heros.classe.statPrincipale ? 'principale' : '' }, el('span', {}, t(`stat.${nom}`)), el('span', {}, s[nom]))),
        el('div', {}, el('span', {}, t('stat.vie')), el('span', {}, s.vieMax)),
        el('div', {}, el('span', {}, t('stat.mana')), el('span', {}, s.manaMax)),
        el('div', {}, el('span', {}, t('inventaire.attaque')), el('span', {}, s.attaqueArme)),
        el('div', {}, el('span', {}, t('inventaire.armure')), el('span', {}, s.armure)),
        el('div', {}, el('span', {}, 'Critique'), el('span', {}, `${Math.round(s.critique * 100)} %`)),
      );
      equipement.append(stats);

      const sac = el('div', { class: 'colonne large' }, el('h3', {}, `${t('inventaire.sac')} (${heros.inventaire.length}/${TAILLE_SAC}) — ${heros.or} or`));
      const liste = el('div', { class: 'liste-objets' });
      for (const element of heros.inventaire) {
        const objet = donnees.objets.get(element.id);
        if (!objet || estEquipe(heros, element.uid)) continue;
        const empechement = objet.emplacement ? empechementEquiper(heros, objet) : null;
        let action = null;
        if (objet.type === 'consommable') {
          action = el('button', { class: 'bouton discret', onclick: () => { utiliser(heros, donnees, element.uid); panneau.rafraichir(); } }, t('inventaire.utiliser'));
        } else if (objet.emplacement) {
          action = el('button', {
            class: 'bouton discret',
            disabled: Boolean(empechement),
            onclick: () => { equiper(heros, donnees, element.uid); ctx.sauvegarder(); panneau.rafraichir(); },
          }, t('inventaire.equiper'));
        }
        liste.append(el('div', { class: 'ligne-objet' },
          el('div', {},
            el('div', { class: 'nom' }, `${t(`${objet.texte}.nom`)}${element.quantite > 1 ? ` ×${element.quantite}` : ''}`),
            el('div', { class: 'details' }, descriptionObjet(objet, donnees)),
            empechement === 'niveau' ? el('div', { class: 'alerte' }, t('inventaire.niveauTrop', { n: objet.niveauRequis })) : null,
            empechement === 'classe' ? el('div', { class: 'alerte' }, t('inventaire.mauvaiseClasse', { classe: objet.classe ? t(`classe.${objet.classe}.nom`) : '—' })) : null,
          ),
          action,
        ));
      }
      sac.append(liste);
      corps.append(el('div', { class: 'colonnes' }, equipement, sac));
    },
  });
}
