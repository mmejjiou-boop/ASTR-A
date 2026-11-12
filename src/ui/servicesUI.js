// Services du village : boutiques (marchand, armurier, forgeronne, alchimiste),
// banque, maître des compétences, voyage rapide (portail).
import { el } from './dom.js';
import { t } from '../core/textes.js';
import { emettre } from '../core/evenements.js';
import { ouvrirPanneau } from './panneau.js';
import { acheter, vendre, peutVendre, prixVente, empechementEquiper } from '../systemes/inventaire.js';
import { descriptionObjet } from './inventaireUI.js';

const nomObjet = (o) => t(`${o.texte}.nom`);

// ctx : { donnees, heros, progression, sauvegarder, destinations(), voyager(dest) }
export function ouvrirBoutique(pnj, ctx) {
  const { donnees, heros } = ctx;
  let onglet = 'acheter';
  const panneau = ouvrirPanneau({
    titre: t(`pnj.${pnj.id}.nom`),
    sousTitre: t(`pnj.${pnj.id}.titre`),
    classe: 'panneau-boutique',
    construire(corps) {
      corps.append(el('div', { class: 'onglets' },
        el('button', { class: `onglet ${onglet === 'acheter' ? 'actif' : ''}`, onclick: () => { onglet = 'acheter'; panneau.rafraichir(); } }, t('boutique.acheter')),
        el('button', { class: `onglet ${onglet === 'vendre' ? 'actif' : ''}`, onclick: () => { onglet = 'vendre'; panneau.rafraichir(); } }, t('boutique.vendre')),
        el('span', { class: 'bourse' }, `${heros.or} or`),
      ));
      const liste = el('div', { class: 'liste-objets' });
      if (onglet === 'acheter') {
        for (const id of pnj.def.boutique || []) {
          const objet = donnees.objets.get(id);
          if (!objet) continue;
          // La forgeronne ne propose que l'arme de la classe du héros.
          if (objet.classe && objet.classe !== heros.classe.id) continue;
          const empechement = objet.emplacement ? empechementEquiper(heros, objet) : null;
          const trop = (objet.niveauRequis || 1) > heros.niveau;
          liste.append(el('div', { class: 'ligne-objet' },
            el('div', {}, el('div', { class: 'nom' }, nomObjet(objet)), el('div', { class: 'details' }, descriptionObjet(objet, donnees)),
              trop ? el('div', { class: 'alerte' }, t('boutique.niveau', { n: objet.niveauRequis })) : null,
              !trop && empechement === 'classe' ? el('div', { class: 'alerte' }, t('inventaire.mauvaiseClasse', { classe: t(`${heros.classe.texte}.nom`) })) : null),
            el('button', {
              class: 'bouton discret',
              disabled: heros.or < objet.prix,
              onclick: () => {
                if (acheter(heros, donnees, id)) {
                  emettre('message', { cle: 'boutique.achete', valeurs: { nom: nomObjet(objet) } });
                  ctx.sauvegarder();
                } else emettre('message', { cle: 'boutique.pasAssez' });
                panneau.rafraichir();
              },
            }, t('boutique.prix', { n: objet.prix })),
          ));
        }
      } else {
        const vendables = heros.inventaire.filter((o) => peutVendre(heros, donnees, o));
        if (!vendables.length) liste.append(el('p', { class: 'vide' }, t('boutique.rien')));
        for (const element of vendables) {
          const objet = donnees.objets.get(element.id);
          liste.append(el('div', { class: 'ligne-objet' },
            el('div', {}, el('div', { class: 'nom' }, `${nomObjet(objet)}${element.quantite > 1 ? ` ×${element.quantite}` : ''}`), el('div', { class: 'details' }, descriptionObjet(objet, donnees))),
            el('button', {
              class: 'bouton discret',
              onclick: () => {
                const gain = vendre(heros, donnees, element.uid);
                if (gain) emettre('message', { cle: 'boutique.vendu', valeurs: { nom: nomObjet(objet), n: gain } });
                ctx.sauvegarder();
                panneau.rafraichir();
              },
            }, `+${prixVente(objet)} or`),
          ));
        }
      }
      corps.append(liste);
    },
  });
}

export function ouvrirBanque(ctx) {
  const { heros, progression } = ctx;
  const banque = progression.banque;
  const panneau = ouvrirPanneau({
    titre: t('banque.titre'),
    classe: 'panneau-petit',
    construire(corps) {
      const champ = el('input', { type: 'number', min: '1', value: '10', class: 'champ-nombre' });
      const deplacer = (versBanque, tout = false) => {
        const max = versBanque ? heros.or : banque.or;
        const n = Math.min(max, tout ? max : Math.max(0, Math.floor(Number(champ.value) || 0)));
        if (n <= 0) return;
        if (versBanque) { heros.or -= n; banque.or += n; } else { banque.or -= n; heros.or += n; }
        ctx.sauvegarder();
        panneau.rafraichir();
      };
      corps.append(
        el('p', {}, t('banque.porte', { n: heros.or })),
        el('p', {}, t('banque.depose', { n: banque.or })),
        el('p', { class: 'note' }, t('banque.explication')),
        el('div', { class: 'ligne-boutons' }, champ,
          el('button', { class: 'bouton discret', onclick: () => deplacer(true) }, t('banque.deposer')),
          el('button', { class: 'bouton discret', onclick: () => deplacer(false) }, t('banque.retirer'))),
        el('div', { class: 'ligne-boutons' },
          el('button', { class: 'bouton discret', onclick: () => deplacer(true, true) }, `${t('banque.deposer')} : ${t('banque.tout')}`),
          el('button', { class: 'bouton discret', onclick: () => deplacer(false, true) }, `${t('banque.retirer')} : ${t('banque.tout')}`)),
      );
    },
  });
}

export function ouvrirMaitre(ctx) {
  const { donnees, heros } = ctx;
  ouvrirPanneau({
    titre: t('maitre.titre', { classe: t(`${heros.classe.texte}.nom`) }),
    classe: 'panneau-petit',
    construire(corps) {
      const { actives, passive, ultime } = heros.classe.competences;
      const lignes = [...actives.map((id) => [id, 'active']), [passive, 'passive'], [ultime, 'ultime']].filter(([id]) => id);
      for (const [id, type] of lignes) {
        const c = donnees.competences.get(id);
        const debloquee = heros.competencesDebloquees.includes(id);
        corps.append(el('div', { class: `ligne-competence ${debloquee ? '' : 'verrouillee'}` },
          el('div', { class: 'nom' }, `${t(`${c.texte}.nom`)} — ${t(`maitre.${type}`)}`),
          el('div', { class: 'details' }, t(`${c.texte}.description`)),
          el('div', { class: 'details' }, debloquee ? t('maitre.debloquee') : t('maitre.verrouillee', { n: c.niveauRequis })),
          c.coutMana ? el('div', { class: 'details' }, `${c.coutMana} mana · ${c.recharge} s`) : null,
        ));
      }
      if (lignes.length < 5) corps.append(el('p', { class: 'note' }, t('maitre.aVenir')));
    },
  });
}

export function ouvrirPortail(ctx) {
  ouvrirPanneau({
    titre: t('portail.titre'),
    classe: 'panneau-petit',
    construire(corps, panneau) {
      const destinations = ctx.destinations();
      if (!destinations.length) corps.append(el('p', {}, t('portail.aucun')));
      for (const d of destinations) {
        corps.append(el('button', {
          class: 'choix',
          onclick: () => { panneau.fermer(); ctx.voyager(d); },
        }, `${d.type === 'tour' ? '▲' : '⌂'} ${d.nom} — ${t(d.type === 'tour' ? 'portail.tour' : 'portail.village')}`));
      }
    },
  });
}

export function reposAuberge(ctx) {
  const { heros } = ctx;
  if (heros.or < 10) {
    emettre('message', { cle: 'auberge.pasAssez' });
    return;
  }
  heros.or -= 10;
  heros.vie = heros.stats.vieMax;
  heros.mana = heros.stats.manaMax;
  heros.effets = [];
  emettre('message', { cle: 'auberge.repos' });
  ctx.sauvegarder();
}

