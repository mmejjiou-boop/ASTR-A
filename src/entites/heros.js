// Le héros : progression (niveau, XP, or), statistiques, état de combat.
import * as THREE from 'three';
import { calculerStatsHeros, xpPourNiveau } from '../systemes/stats.js';
import { creerHeros } from '../moteur3d/formes.js';
import { emettre } from '../core/evenements.js';

export class Heros {
  constructor(donnees, profil) {
    this.donnees = donnees;
    this.config = donnees.config;
    this.nom = profil.nom;
    this.classe = donnees.classes.get(profil.classe);
    if (!this.classe) throw new Error(`Classe inconnue : ${profil.classe}`);
    this.niveau = profil.niveau || 1;
    this.xp = profil.xp || 0;
    this.or = profil.or || 0;
    this.inventaire = profil.inventaire;
    this.equipement = profil.equipement;
    this.competencesDebloquees = profil.competencesDebloquees;
    this.calculerStats();
    this.vie = Math.min(profil.vie ?? this.stats.vieMax, this.stats.vieMax);
    this.mana = Math.min(profil.mana ?? this.stats.manaMax, this.stats.manaMax);
    if (this.vie <= 0) this.vie = this.stats.vieMax;
    this.endurance = this.config.deplacement.enduranceMax;

    this.position = new THREE.Vector3();
    this.vitesse = new THREE.Vector3(); // vitesse horizontale actuelle
    this.vitesseY = 0;
    this.orientation = 0;
    this.auSol = true;
    this.effets = [];
    this.recharges = new Map(); // id de compétence → secondes restantes
    this.bouclierAbsorbe = 0;
    this.bouclierRestant = 0;
    this.delaiEndurance = 0;
    this.epuise = false;
    this.roulade = null;   // { temps, direction }
    this.attaque = null;   // { temps, duree, incantation }
    this.ruee = null;      // { temps, duree, depart, direction, distance, competence, touches }
    this.bloque = false;
    this.mort = false;
    this.rayon = 0.4;

    this.escalade = null;   // { angle } pendant l'escalade d'une tour
    this.modele = this.construireModele();
  }

  // L'équipement référence les objets de l'inventaire par leur uid.
  objetEquipe(emplacement) {
    const uid = this.equipement[emplacement];
    const element = uid && this.inventaire.find((o) => o.uid === uid);
    return element ? this.donnees.objets.get(element.id) : null;
  }

  idsEquipes() {
    const ids = {};
    for (const emplacement of Object.keys(this.equipement)) ids[emplacement] = this.objetEquipe(emplacement)?.id || null;
    return ids;
  }

  // Après un changement d'équipement : statistiques et apparence (arme, bouclier).
  changementEquipement() {
    const ratioVie = this.vie / this.stats.vieMax;
    const ratioMana = this.mana / this.stats.manaMax;
    this.calculerStats();
    this.vie = Math.max(1, Math.round(ratioVie * this.stats.vieMax));
    this.mana = Math.round(ratioMana * this.stats.manaMax);
    const ancien = this.modele;
    this.modele = this.construireModele();
    if (ancien.parent) {
      ancien.parent.add(this.modele);
      ancien.parent.remove(ancien);
    }
  }

  construireModele() {
    const arme = this.objetEquipe('armePrincipale');
    const secondaire = this.objetEquipe('armeSecondaire');
    return creerHeros(this.classe, arme, secondaire?.categorie === 'bouclier' ? secondaire : null);
  }

  calculerStats() {
    this.stats = calculerStatsHeros(this.donnees, this.classe, this.niveau, this.idsEquipes());
  }

  get xpSuivant() {
    return this.niveau >= this.config.niveauMax ? 0 : xpPourNiveau(this.config, this.niveau);
  }

  gagnerXP(quantite) {
    if (this.niveau >= this.config.niveauMax) return;
    this.xp += quantite;
    while (this.niveau < this.config.niveauMax && this.xp >= this.xpSuivant) {
      this.xp -= this.xpSuivant;
      this.niveau++;
      this.calculerStats();
      this.vie = this.stats.vieMax;
      this.mana = this.stats.manaMax;
      this.debloquerCompetences();
      emettre('niveau', { niveau: this.niveau });
    }
    if (this.niveau >= this.config.niveauMax) this.xp = 0;
  }

  gagnerOr(quantite) {
    this.or += quantite;
  }

  // Débloque les compétences de la classe dont le niveau requis est atteint.
  debloquerCompetences() {
    const { actives, passive, ultime } = this.classe.competences;
    for (const id of [...actives, passive, ultime]) {
      if (!id || this.competencesDebloquees.includes(id)) continue;
      const competence = this.donnees.competences.get(id);
      if (competence && competence.niveauRequis <= this.niveau) this.competencesDebloquees.push(id);
    }
  }

  // Première compétence active débloquée (l'étape 3 ajoutera des raccourcis).
  get competencePrincipale() {
    const id = this.classe.competences.actives.find((c) => this.competencesDebloquees.includes(c));
    return id ? this.donnees.competences.get(id) : null;
  }

  get invincible() {
    const r = this.config.deplacement.roulade;
    return (this.roulade && this.roulade.temps < r.invincibilite) || this.mort;
  }

  positionTete() {
    return new THREE.Vector3(this.position.x, this.position.y + 2.2, this.position.z);
  }

  soigner(montant) {
    const avant = this.vie;
    this.vie = Math.min(this.stats.vieMax, this.vie + montant);
    return this.vie - avant;
  }

  // Profil enregistré dans la sauvegarde.
  profil() {
    return {
      nom: this.nom,
      classe: this.classe.id,
      niveau: this.niveau,
      xp: this.xp,
      or: this.or,
      vie: Math.round(this.vie),
      mana: Math.round(this.mana),
    };
  }
}

// Équipement et inventaire de départ d'une nouvelle partie.
export function nouveauProfil(donnees, nom, idClasse) {
  const classe = donnees.classes.get(idClasse);
  const equipement = {
    tete: null, torse: null, jambes: null, bottes: null, gants: null,
    armePrincipale: null, armeSecondaire: null, collier: null, anneau1: null, anneau2: null,
  };
  const inventaire = [];
  let uid = 1;
  for (const idObjet of classe.equipementDepart) {
    const objet = donnees.objets.get(idObjet);
    if (!objet) continue;
    const element = { uid: `o${uid++}`, id: idObjet, quantite: 1, rarete: 'commun', bonus: {}, amelioration: 0 };
    inventaire.push(element);
    if (objet.emplacement && !equipement[objet.emplacement]) equipement[objet.emplacement] = element.uid;
  }
  inventaire.push({ uid: `o${uid++}`, id: 'potion_vie_petite', quantite: 3 });
  const competencesDebloquees = classe.competences.actives
    .filter((id) => (donnees.competences.get(id)?.niveauRequis || 99) <= 1);
  return { nom, classe: idClasse, niveau: 1, xp: 0, or: 0, inventaire, equipement, competencesDebloquees };
}
