// Quêtes : disponibilité, acceptation, suivi des objectifs, récompenses (une seule fois).
import { emettre, ecouter } from '../core/evenements.js';
import { t } from '../core/textes.js';
import { ajouter, compter, retirer } from './inventaire.js';

export function creerQuetes(donnees, progression, heros) {
  const etat = progression.quetes;
  const desabonnements = [];

  const quete = (id) => donnees.quetes.get(id);
  const estActive = (id) => Boolean(etat.actives[id]);
  const estTerminee = (id) => etat.terminees.includes(id);

  function estDisponible(q) {
    if (estActive(q.id) || estTerminee(q.id)) return false;
    if ((q.prerequis?.niveau || 1) > heros.niveau) return false;
    return (q.prerequis?.quetes || []).every(estTerminee);
  }

  // Avancement d'un objectif (les objets à collecter se comptent dans le sac).
  function avancement(q, index) {
    const o = q.objectifs[index];
    const max = o.quantite || 1;
    if (o.type === 'collecter') return Math.min(max, compter(heros, o.cible));
    return Math.min(max, etat.actives[q.id]?.objectifs[index] || 0);
  }

  function estFinie(id) {
    const q = quete(id);
    return estActive(id) && q.objectifs.every((o, i) => avancement(q, i) >= (o.quantite || 1));
  }

  function nomCible(o) {
    const cible = o.cible;
    if (cible.startsWith('famille:')) return t('objectif.famille', { famille: t(`famille.${cible.slice(8)}`) });
    if (donnees.monstres.has(cible)) return t(`monstre.${cible}.nom`);
    if (donnees.objets.has(cible)) return t(`objet.${cible}.nom`);
    if (donnees.pnj.has(cible)) return t(`pnj.${cible}.nom`);
    if (donnees.donjons.has(cible)) return t(`donjon.${cible}`);
    if (cible.startsWith('tour_')) return t(`tour.${cible}`);
    if (cible === 'coffre_m01_pont') return t('coffre.pont');
    if (`lieu.${cible}` in donnees.textes) return t(`lieu.${cible}`);
    return cible;
  }

  function texteObjectif(o) {
    return t(`objectif.${o.type}`, { cible: nomCible(o) });
  }

  function accepter(id) {
    const q = quete(id);
    if (!q || !estDisponible(q)) return false;
    etat.actives[id] = { objectifs: q.objectifs.map(() => 0) };
    emettre('message', { cle: 'msg.queteAcceptee', valeurs: { titre: t(`${q.texte}.titre`) } });
    emettre('quetesChangees', {});
    verifierFinie(q);
    return true;
  }

  function verifierFinie(q) {
    if (estFinie(q.id) && !etat.actives[q.id].signale) {
      etat.actives[q.id].signale = true;
      emettre('message', { cle: 'msg.queteRendre', valeurs: { nom: t(`pnj.${q.rendu}.nom`) } });
    }
  }

  // Fait avancer les objectifs d'un type donné qui correspondent à la cible.
  function progresser(type, correspond, quantite = 1) {
    let change = false;
    for (const [id, suivi] of Object.entries(etat.actives)) {
      const q = quete(id);
      if (!q) continue;
      q.objectifs.forEach((o, i) => {
        if (o.type !== type || !correspond(o.cible)) return;
        const max = o.quantite || 1;
        if (suivi.objectifs[i] >= max) return;
        suivi.objectifs[i] = Math.min(max, suivi.objectifs[i] + quantite);
        change = true;
        const texte = texteObjectif(o);
        if (suivi.objectifs[i] >= max) emettre('message', { cle: 'msg.objectifFini', valeurs: { texte } });
        else emettre('message', { cle: 'msg.objectif', valeurs: { texte, n: suivi.objectifs[i], max } });
      });
      verifierFinie(q);
    }
    if (change) emettre('quetesChangees', {});
  }

  function rendre(id) {
    const q = quete(id);
    if (!q || !estFinie(id)) return false;
    // Les objets de quête collectés sont remis au donneur.
    q.objectifs.forEach((o) => { if (o.type === 'collecter') retirer(heros, o.cible, o.quantite || 1); });
    delete etat.actives[id];
    // Garantie : une quête terminée ne donne jamais deux fois sa récompense.
    if (!etat.terminees.includes(id)) {
      etat.terminees.push(id);
      const r = q.recompenses || {};
      if (r.or) heros.gagnerOr(r.or);
      for (const o of r.objets || []) ajouter(heros, donnees, o.id, o.quantite || 1);
      if (r.xp) heros.gagnerXP(r.xp);
      emettre('message', { cle: 'msg.queteTerminee', valeurs: { titre: t(`${q.texte}.titre`) } });
      emettre('queteTerminee', { quete: q });
    }
    emettre('quetesChangees', {});
    return true;
  }

  // Les objets de quête ne tombent que si la quête est active et pas encore remplie.
  function objetQueteUtile(idObjet, queteActive) {
    if (!estActive(queteActive)) return false;
    const q = quete(queteActive);
    const o = q.objectifs.find((x) => x.type === 'collecter' && x.cible === idObjet);
    return o && compter(heros, idObjet) < (o.quantite || 1);
  }

  desabonnements.push(
    ecouter('monstreTue', ({ monstre }) => {
      progresser('tuer', (cible) => cible === monstre.def.id || cible === `famille:${monstre.def.famille}`);
      if (monstre.def.boss) progresser('vaincre_boss', (cible) => cible === monstre.def.id);
    }),
    ecouter('parler', ({ pnj }) => progresser('parler', (cible) => cible === pnj)),
    ecouter('lieuDecouvert', ({ lieu }) => progresser('explorer', (cible) => cible === lieu)),
    ecouter('tourActivee', ({ tour }) => progresser('activer_tour', (cible) => cible === tour)),
    ecouter('donjonTermine', ({ donjon }) => progresser('terminer_donjon', (cible) => cible === donjon)),
    ecouter('coffreOuvert', ({ coffre }) => progresser('ouvrir_coffre', (cible) => cible === coffre)),
    ecouter('objetObtenu', () => {
      for (const id of Object.keys(etat.actives)) { const q = quete(id); if (q) verifierFinie(q); }
      emettre('quetesChangees', {});
    }),
  );

  // Quêtes liées à un PNJ, pour son dialogue.
  function pourPnj(idPnj) {
    const toutes = [...donnees.quetes.values()];
    return {
      aRendre: toutes.filter((q) => q.rendu === idPnj && estFinie(q.id)),
      aProposer: toutes.filter((q) => q.donneur === idPnj && estDisponible(q)),
      enCours: toutes.filter((q) => q.donneur === idPnj && estActive(q.id) && !estFinie(q.id)),
    };
  }

  // Marqueur au-dessus d'un PNJ : « ! » (nouvelle quête) ou « ? » (à rendre).
  function marqueur(idPnj) {
    const p = pourPnj(idPnj);
    if (p.aRendre.length) return '?';
    if (p.aProposer.length) return '!';
    return null;
  }

  return {
    estActive, estTerminee, estDisponible, estFinie, avancement, texteObjectif, nomCible,
    accepter, rendre, pourPnj, marqueur, objetQueteUtile,
    actives: () => Object.keys(etat.actives).map(quete).filter(Boolean),
    terminees: () => etat.terminees.map(quete).filter(Boolean),
    detruire: () => desabonnements.forEach((d) => d()),
  };
}
