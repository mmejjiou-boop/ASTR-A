// Tout ce que le joueur a accompli et qui est sauvegardé (hors héros) :
// quêtes, carte (brouillard, tours, lieux), coffres ouverts, donjons, boss, banque.
import { emettre } from './evenements.js';

export class Progression {
  constructor(donnees, sauvegarde = null) {
    this.donnees = donnees;
    const s = sauvegarde || {};
    this.quetes = {
      actives: structuredClone(s.quetes?.actives || {}),
      terminees: [...(s.quetes?.terminees || [])],
    };
    this.carte = {};
    for (const [monde, c] of Object.entries(s.carte || {})) {
      this.carte[monde] = {
        brouillard: c.brouillard ? decoder(c.brouillard) : null,
        toursActivees: [...(c.toursActivees || [])],
        lieuxVisites: [...(c.lieuxVisites || [])],
      };
    }
    this.coffresOuverts = new Set(s.coffresOuverts || []);
    this.donjonsTermines = new Set(s.donjonsTermines || []);
    this.bossVaincus = new Set(s.bossVaincus || []);
    this.banque = { or: s.banque?.or || 0, objets: [...(s.banque?.objets || [])] };
  }

  carteDe(idMonde) {
    const cle = String(idMonde);
    if (!this.carte[cle]) this.carte[cle] = { brouillard: null, toursActivees: [], lieuxVisites: [] };
    const c = this.carte[cle];
    if (!c.brouillard) c.brouillard = new Uint8Array((this.donnees.config.brouillard.grille ** 2) / 8);
    return c;
  }

  // Dévoile un disque de la carte (coordonnées du monde). Renvoie vrai si quelque chose a changé.
  reveler(idMonde, taille, x, z, rayon) {
    const grille = this.donnees.config.brouillard.grille;
    const bits = this.carteDe(idMonde).brouillard;
    const tailleCase = taille / grille;
    const ci = Math.floor((x + taille / 2) / tailleCase);
    const cj = Math.floor((z + taille / 2) / tailleCase);
    const r = Math.ceil(rayon / tailleCase);
    let change = false;
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= grille || j >= grille) continue;
        if ((i - ci) ** 2 + (j - cj) ** 2 > r * r) continue;
        const k = j * grille + i;
        if (!(bits[k >> 3] & (1 << (k & 7)))) {
          bits[k >> 3] |= 1 << (k & 7);
          change = true;
        }
      }
    }
    return change;
  }

  revelerTout(idMonde) {
    this.carteDe(idMonde).brouillard.fill(255);
  }

  estRevele(idMonde, i, j) {
    const grille = this.donnees.config.brouillard.grille;
    const k = j * grille + i;
    return Boolean(this.carteDe(idMonde).brouillard[k >> 3] & (1 << (k & 7)));
  }

  activerTour(idMonde, idTour) {
    const c = this.carteDe(idMonde);
    if (c.toursActivees.includes(idTour)) return false;
    c.toursActivees.push(idTour);
    this.revelerTout(idMonde);
    emettre('tourActivee', { monde: idMonde, tour: idTour });
    return true;
  }

  visiterLieu(idMonde, idLieu) {
    const c = this.carteDe(idMonde);
    if (c.lieuxVisites.includes(idLieu)) return false;
    c.lieuxVisites.push(idLieu);
    return true;
  }

  serialiser() {
    const carte = {};
    for (const [monde, c] of Object.entries(this.carte)) {
      carte[monde] = {
        brouillard: c.brouillard ? encoder(c.brouillard) : null,
        toursActivees: c.toursActivees,
        lieuxVisites: c.lieuxVisites,
      };
    }
    return {
      quetes: this.quetes,
      carte,
      coffresOuverts: [...this.coffresOuverts],
      donjonsTermines: [...this.donjonsTermines],
      bossVaincus: [...this.bossVaincus],
      banque: this.banque,
    };
  }
}

// Brouillard : 1 bit par case, stocké en base64 (environ 11 Ko par monde).
function encoder(octets) {
  let texte = '';
  for (let i = 0; i < octets.length; i += 0x8000) texte += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(texte);
}

function decoder(base64) {
  const texte = atob(base64);
  const octets = new Uint8Array(texte.length);
  for (let i = 0; i < texte.length; i++) octets[i] = texte.charCodeAt(i);
  return octets;
}
