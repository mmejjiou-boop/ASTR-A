// Inventaire du héros : piles, équipement, potions, vente.
// L'inventaire est une liste d'éléments { uid, id, quantite, rarete, bonus, amelioration }
// et l'équipement associe chaque emplacement à l'uid d'un élément.
import { emettre } from '../core/evenements.js';

export const EMPLACEMENTS = ['tete', 'torse', 'jambes', 'bottes', 'gants', 'armePrincipale', 'armeSecondaire', 'collier', 'anneau1', 'anneau2'];
export const TAILLE_SAC = 40;
const PART_VENTE = 0.4;

function nouvelUid(heros) {
  let max = 0;
  for (const o of heros.inventaire) max = Math.max(max, Number(String(o.uid).slice(1)) || 0);
  return `o${max + 1}`;
}

export function compter(heros, id) {
  return heros.inventaire.filter((o) => o.id === id).reduce((s, o) => s + o.quantite, 0);
}

export function estEquipe(heros, uid) {
  return Object.values(heros.equipement).includes(uid);
}

// Ajoute un objet. Renvoie la quantité réellement ajoutée (le sac peut être plein).
export function ajouter(heros, donnees, id, quantite = 1) {
  const objet = donnees.objets.get(id);
  if (!objet) return 0;
  const pileMax = objet.pileMax || 1;
  let reste = quantite;
  if (pileMax > 1) {
    for (const o of heros.inventaire) {
      if (o.id !== id || o.quantite >= pileMax) continue;
      const ajout = Math.min(reste, pileMax - o.quantite);
      o.quantite += ajout;
      reste -= ajout;
      if (!reste) break;
    }
  }
  while (reste > 0 && heros.inventaire.length < TAILLE_SAC) {
    const ajout = Math.min(reste, pileMax);
    const element = { uid: nouvelUid(heros), id, quantite: ajout };
    if (pileMax === 1) Object.assign(element, { rarete: 'commun', bonus: {}, amelioration: 0 });
    heros.inventaire.push(element);
    reste -= ajout;
  }
  const ajoute = quantite - reste;
  if (ajoute > 0) emettre('objetObtenu', { id, quantite: ajoute });
  if (reste > 0) emettre('message', { cle: 'msg.sacPlein' });
  return ajoute;
}

// Retire une quantité d'un objet (les piles non équipées d'abord).
export function retirer(heros, id, quantite = 1) {
  let reste = quantite;
  for (const o of [...heros.inventaire]) {
    if (o.id !== id || estEquipe(heros, o.uid)) continue;
    const retrait = Math.min(reste, o.quantite);
    o.quantite -= retrait;
    reste -= retrait;
    if (o.quantite <= 0) heros.inventaire.splice(heros.inventaire.indexOf(o), 1);
    if (!reste) break;
  }
  return quantite - reste;
}

// Raison pour laquelle l'objet ne peut pas être porté (ou null).
export function empechementEquiper(heros, objet) {
  if (!objet.emplacement) return 'type';
  if ((objet.niveauRequis || 1) > heros.niveau) return 'niveau';
  if (objet.classe && objet.classe !== heros.classe.id) return 'classe';
  // Arme : seulement la catégorie de l'arme de prédilection de la classe.
  if (objet.emplacement === 'armePrincipale' && objet.categorie !== heros.classe.armePredilection) return 'classe';
  return null;
}

export function equiper(heros, donnees, uid) {
  const element = heros.inventaire.find((o) => o.uid === uid);
  const objet = element && donnees.objets.get(element.id);
  if (!objet || empechementEquiper(heros, objet)) return false;
  let emplacement = objet.emplacement;
  if (emplacement === 'anneau') emplacement = !heros.equipement.anneau1 ? 'anneau1' : !heros.equipement.anneau2 ? 'anneau2' : 'anneau1';
  heros.equipement[emplacement] = uid;
  heros.changementEquipement();
  return true;
}

export function desequiper(heros, emplacement) {
  if (!heros.equipement[emplacement]) return false;
  heros.equipement[emplacement] = null;
  heros.changementEquipement();
  return true;
}

// Utilise une potion. Renvoie vrai si elle a servi.
export function utiliser(heros, donnees, uid) {
  const element = heros.inventaire.find((o) => o.uid === uid);
  const objet = element && donnees.objets.get(element.id);
  if (!objet || objet.type !== 'consommable') return false;
  if ((heros.recharges.get('__potion') || 0) > 0) {
    emettre('message', { cle: 'msg.recharge' });
    return false;
  }
  if (objet.effet.soin) {
    const soin = heros.soigner(objet.effet.soin);
    emettre('soin', { position: heros.positionTete(), montant: soin });
  }
  if (objet.effet.mana) heros.mana = Math.min(heros.stats.manaMax, heros.mana + objet.effet.mana);
  heros.recharges.set('__potion', objet.recharge || 3);
  element.quantite -= 1;
  if (element.quantite <= 0) heros.inventaire.splice(heros.inventaire.indexOf(element), 1);
  emettre('message', { cle: 'inventaire.potionUtilisee', valeurs: { nom: donnees.textes[`${objet.texte}.nom`] } });
  return true;
}

// Potion de vie la plus adaptée (touche R).
export function potionRapide(heros, donnees) {
  const potions = heros.inventaire
    .map((o) => ({ o, objet: donnees.objets.get(o.id) }))
    .filter(({ objet }) => objet?.type === 'consommable' && objet.effet?.soin)
    .sort((a, b) => a.objet.effet.soin - b.objet.effet.soin);
  if (!potions.length) {
    emettre('message', { cle: 'msg.potion' });
    return false;
  }
  const manque = heros.stats.vieMax - heros.vie;
  const choix = potions.find(({ objet }) => objet.effet.soin >= manque) || potions[potions.length - 1];
  return utiliser(heros, donnees, choix.o.uid);
}

export function prixVente(objet) {
  return Math.max(1, Math.floor((objet.prix || 0) * PART_VENTE));
}

export function peutVendre(heros, donnees, element) {
  const objet = donnees.objets.get(element.id);
  return objet && objet.type !== 'quete' && !objet.unique && (objet.prix || 0) > 0 && !estEquipe(heros, element.uid);
}

export function vendre(heros, donnees, uid) {
  const element = heros.inventaire.find((o) => o.uid === uid);
  if (!element || !peutVendre(heros, donnees, element)) return 0;
  const objet = donnees.objets.get(element.id);
  const gain = prixVente(objet);
  element.quantite -= 1;
  if (element.quantite <= 0) heros.inventaire.splice(heros.inventaire.indexOf(element), 1);
  heros.or += gain;
  return gain;
}

export function acheter(heros, donnees, id) {
  const objet = donnees.objets.get(id);
  if (!objet || heros.or < objet.prix) return false;
  if (ajouter(heros, donnees, id, 1) !== 1) return false;
  heros.or -= objet.prix;
  return true;
}
