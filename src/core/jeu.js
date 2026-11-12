// Chef d'orchestre : écrans, démarrage d'une partie, changement de monde
// (extérieur ↔ donjon), voyage rapide, interactions, fenêtres, boucle de jeu, sauvegarde.
import * as THREE from 'three';
import { creerRendu } from '../moteur3d/rendu.js';
import { creerEntrees } from '../moteur3d/entrees.js';
import { creerCamera } from '../moteur3d/camera.js';
import { creerMonde } from '../monde/monde.js';
import { tailleDonjon, centreSalle } from '../monde/donjon.js';
import { Heros, nouveauProfil } from '../entites/heros.js';
import { deplacerHeros } from '../systemes/deplacement.js';
import { utiliser } from '../systemes/competences.js';
import { creerQuetes } from '../systemes/quetes.js';
import { potionRapide } from '../systemes/inventaire.js';
import { Progression } from './progression.js';
import { afficherEcranTitre } from '../ui/ecranTitre.js';
import { afficherCreation } from '../ui/creationPersonnage.js';
import { creerHud } from '../ui/hud.js';
import { creerSurcouche } from '../ui/surcouche.js';
import { afficherPause } from '../ui/menuPause.js';
import { configurerPanneaux, panneauOuvert } from '../ui/panneau.js';
import { ouvrirDialogue } from '../ui/dialogueUI.js';
import { ouvrirBoutique, ouvrirBanque, ouvrirMaitre, ouvrirPortail, reposAuberge } from '../ui/servicesUI.js';
import { ouvrirInventaire } from '../ui/inventaireUI.js';
import { ouvrirJournal, creerSuiviQuetes } from '../ui/journalUI.js';
import { creerCartes } from '../ui/carteUI.js';
import { el, ui } from '../ui/dom.js';
import { informer, texteACopier } from '../ui/dialogue.js';
import { t } from './textes.js';
import { ecouter, emettre } from './evenements.js';
import * as sauvegarde from './sauvegarde.js';
import { debugActif, creerTriche } from '../../outils/triche.js';

const OPTIONS_PAR_DEFAUT = { sensibiliteSouris: 1, inverserY: false, volume: 0.8, bloom: true, details: true };
const MONDE_DEPART = 1;

export function creerJeu(donnees) {
  const { config } = donnees;
  sauvegarde.configurerSauvegarde(config);
  const rendu = creerRendu(document.getElementById('jeu'), config.rendu);
  const entrees = creerEntrees(rendu.rendu.domElement);
  entrees.definirActif(false);

  const jeu = {
    heros: null,
    monde: null,
    camera: null,
    progression: null,
    quetes: null,
    hud: null,
    surcouche: null,
    suivi: null,
    cartes: null,
    triche: null,
    pause: null,
    panneau: null,
    ecranMort: null,
    cinematique: null,
    retourDonjon: null, // { monde, x, z, angle } : où ressortir d'un donjon
    tempsDeJeu: 0,
    depuisSauvegarde: 0,
    options: { ...OPTIONS_PAR_DEFAUT },
    enPartie: false,
    desabonnements: [],
  };

  // Fenêtres : le jeu se met en pause et libère la souris.
  configurerPanneaux({
    ouverture(panneau) {
      jeu.panneau = panneau;
      if (entrees.verrouille) entrees.liberer();
    },
    fermeture(panneau, reprendre) {
      if (jeu.panneau === panneau) jeu.panneau = null;
      if (reprendre && jeu.enPartie) entrees.verrouiller();
    },
  });

  const cameraTitre = { angle: 0 };

  function afficherTitre() {
    afficherEcranTitre({
      sauvegardeExiste: sauvegarde.existe(donnees),
      surNouvelle: () => afficherCreation(donnees, {
        surValider: (nom, idClasse) => demarrer(nouveauProfil(donnees, nom, idClasse), null),
        surRetour: afficherTitre,
      }),
      surContinuer: () => {
        const s = sauvegarde.lire(donnees);
        if (s) demarrerDepuisSauvegarde(s);
        else afficherTitre();
      },
      surImporter: async (fermerTitre) => {
        try {
          const s = await sauvegarde.importer(donnees);
          sauvegarde.ecrire(s);
          fermerTitre();
          demarrerDepuisSauvegarde(s);
        } catch (e) {
          informer(t('msg.importErreur', { e: e.message }));
        }
      },
    });
  }

  function demarrerDepuisSauvegarde(s) {
    const profil = {
      ...s.personnage,
      inventaire: s.inventaire,
      equipement: s.equipement,
      competencesDebloquees: s.competences.debloquees,
    };
    jeu.options = { ...OPTIONS_PAR_DEFAUT, ...(s.options || {}) };
    jeu.tempsDeJeu = s.tempsDeJeu || 0;
    demarrer(profil, s);
  }

  // ---------- Contexte partagé avec le monde et les fenêtres ----------
  const actions = {
    sauvegarder: () => sauvegarder(),
    ouvrirDialogue: (pnj) => ouvrirDialogue(pnj, contexteUI()),
    entrerDonjon: (id) => entrerDonjon(id),
    sortirDonjon: () => sortirDonjon(),
    activerTour: (tour) => activerTour(tour),
    reapparaitre: () => reapparaitre(),
  };

  function contexteUI() {
    return {
      donnees,
      heros: jeu.heros,
      quetes: jeu.quetes,
      progression: jeu.progression,
      sauvegarder,
      destinations,
      voyager,
      monde: () => jeu.monde,
      ciblesQuetes,
      ouvrirService(service, pnj) {
        const ctx = contexteUI();
        if (['marchand', 'armurier', 'forgeron', 'alchimiste'].includes(service)) ouvrirBoutique(pnj, ctx);
        else if (service === 'banque') ouvrirBanque(ctx);
        else if (service === 'maitreCompetences') ouvrirMaitre(ctx);
        else if (service === 'portail') ouvrirPortail(ctx);
        else if (service === 'auberge') reposAuberge(ctx);
        else if (service === 'tableauQuetes') ouvrirJournal(ctx);
      },
    };
  }

  function chargerMonde(def) {
    jeu.monde?.detruire();
    jeu.monde = creerMonde({ donnees, rendu, heros: jeu.heros, camera: jeu.camera, progression: jeu.progression, quetes: jeu.quetes, actions }, def);
    appliquerDetails();
    return jeu.monde;
  }

  // Option « Herbe et particules » : on peut la couper si le jeu manque de fluidité.
  function appliquerDetails() {
    const nature = jeu.monde?.nature;
    if (!nature) return;
    nature.herbe.groupe.visible = jeu.options.details !== false;
    nature.pollen.groupe.visible = jeu.options.details !== false;
  }

  function defDonjon(id) {
    const d = donnees.donjons.get(id);
    return { ...d, estDonjon: true, taille: tailleDonjon(d) };
  }

  function demarrer(profil, s) {
    quitterPartie(false);
    const heros = new Heros(donnees, profil);
    heros.debloquerCompetences();
    const progression = new Progression(donnees, s);
    const quetes = creerQuetes(donnees, progression, heros);
    const camera = creerCamera(rendu.camera, config, { hauteur: (x, z) => (jeu.monde ? jeu.monde.collisions.hauteur(x, z) : 0) });
    camera.etat.sensibilite = jeu.options.sensibiliteSouris;
    camera.etat.inverserY = jeu.options.inverserY;
    rendu.definirBloom(jeu.options.bloom);
    Object.assign(jeu, { heros, progression, quetes, camera, enPartie: true, depuisSauvegarde: 0, retourDonjon: null });
    if (!s) jeu.tempsDeJeu = 0;

    const idMonde = s ? s.position.monde : MONDE_DEPART;
    const defMonde = donnees.mondes.get(idMonde) || donnees.mondes.get(MONDE_DEPART);
    const monde = chargerMonde(defMonde);
    if (s && donnees.mondes.has(s.position.monde)) monde.placerHeros(s.position.x, s.position.z, s.position.orientation);
    else monde.placerHeros(defMonde.depart[0], defMonde.depart[1], Math.PI);
    rendu.camera.position.set(heros.position.x, heros.position.y + 4, heros.position.z - 7);

    jeu.hud = creerHud();
    jeu.surcouche = creerSurcouche(rendu.camera);
    jeu.suivi = creerSuiviQuetes(quetes);
    jeu.cartes = creerCartes(contexteUI());
    if (debugActif()) jeu.triche = creerTriche(jeu);
    entrees.definirActif(true);
    jeu.hud.afficherCliquer(!entrees.verrouille);
    if (!sauvegarde.stockageDisponible()) jeu.surcouche.message(t('msg.stockage'), false);

    jeu.desabonnements.push(
      ecouter('monstreTue', () => sauvegarder()),
      ecouter('niveau', () => sauvegarder()),
      ecouter('queteTerminee', () => sauvegarder()),
      ecouter('mortHeros', () => afficherMort(true)),
    );
    sauvegarder();
  }

  function afficherMort(visible) {
    jeu.ecranMort?.remove();
    jeu.ecranMort = null;
    if (visible) {
      jeu.ecranMort = el('div', { class: 'ecran-mort' }, el('p', {}, t('msg.mort')));
      ui().append(jeu.ecranMort);
    }
  }

  // ---------- Mondes, donjons, voyage ----------
  // Point de réapparition : le départ du monde, sur la place du village.
  function villageDe(idMonde) {
    const def = donnees.mondes.get(idMonde) || donnees.mondes.get(MONDE_DEPART);
    return { def, x: def.depart[0], z: def.depart[1] };
  }

  function entrerDonjon(id) {
    const defMonde = jeu.monde.def;
    const point = jeu.monde.points.donjons.find((d) => d.id === id);
    jeu.retourDonjon = { monde: defMonde.id, x: point.x + Math.sin(point.angle) * 6, z: point.z + Math.cos(point.angle) * 6, angle: point.angle };
    const monde = chargerMonde(defDonjon(id));
    monde.placerHeros(0, centreSalle(0) - 4, 0);
    emettre('message', { cle: 'msg.donjonEntre', valeurs: { nom: t(monde.def.texte) }, grand: true });
    if (jeu.progression.donjonsTermines.has(id)) emettre('message', { cle: 'msg.dejaTermine' });
    sauvegarder();
  }

  function sortirDonjon() {
    const r = jeu.retourDonjon;
    const def = donnees.mondes.get(r?.monde ?? MONDE_DEPART);
    const monde = chargerMonde(def);
    if (r) monde.placerHeros(r.x, r.z, r.angle);
    else monde.placerHeros(def.depart[0], def.depart[1], 0);
    jeu.retourDonjon = null;
    sauvegarder();
  }

  // Mort : retour au village du monde (le monde 1 n'enlève rien).
  function reapparaitre() {
    const heros = jeu.heros;
    const idMonde = jeu.monde.estDonjon ? jeu.monde.def.monde : jeu.monde.def.id;
    heros.mort = false;
    heros.vie = heros.stats.vieMax;
    heros.mana = heros.stats.manaMax;
    heros.endurance = config.deplacement.enduranceMax;
    heros.effets = [];
    heros.modele.rotation.z = 0;
    const village = villageDe(idMonde);
    const monde = jeu.monde.estDonjon || jeu.monde.def.id !== village.def.id ? chargerMonde(village.def) : jeu.monde;
    jeu.retourDonjon = null;
    monde.placerHeros(village.x, village.z, 0);
    for (const m of monde.monstres) if (m.etat === 'poursuite') m.etat = 'retour';
    afficherMort(false);
    jeu.surcouche.message(t('msg.reapparition'));
    sauvegarder();
  }

  // Destinations du voyage rapide : tours activées et villages visités.
  function destinations() {
    const liste = [];
    for (const def of donnees.mondes.values()) {
      if (def.test) continue;
      const carte = jeu.progression.carteDe(def.id);
      if (def.village && carte.lieuxVisites.includes(def.village.id)) {
        liste.push({ type: 'village', monde: def.id, nom: t(def.village.texte), x: def.village.position[0], z: def.village.position[1] + 12 });
      }
      if (def.tour && carte.toursActivees.includes(def.tour.id)) {
        liste.push({ type: 'tour', monde: def.id, nom: t(`tour.${def.tour.id}`), x: def.tour.position[0], z: def.tour.position[1] + def.tour.rayon + 6, orientation: Math.PI });
      }
    }
    return liste;
  }

  function voyager(destination) {
    emettre('message', { cle: 'msg.voyage', valeurs: { nom: destination.nom } });
    let monde = jeu.monde;
    if (monde.estDonjon || monde.def.id !== destination.monde) monde = chargerMonde(donnees.mondes.get(destination.monde));
    jeu.retourDonjon = null;
    monde.placerHeros(destination.x, destination.z, destination.orientation || 0);
    monde.visuels.colonne(jeu.heros.position, '#7ff0ff');
    sauvegarder();
  }

  // Éveil d'une tour : la région entière apparaît sur la carte, avec une vue panoramique.
  function activerTour(tour) {
    if (!jeu.progression.activerTour(jeu.monde.def.id, tour.id)) return;
    tour.definirActive(true);
    jeu.monde.visuels.anneau(new THREE.Vector3(tour.x, tour.base + tour.hauteur, tour.z), 30, 0x7ff0ff, 1.5);
    jeu.cinematique = { temps: 0, duree: 5, centre: new THREE.Vector3(tour.x, tour.base + tour.hauteur, tour.z) };
    emettre('message', { cle: 'msg.tourActivee', valeurs: { monde: t(jeu.monde.def.texte) }, grand: true });
    sauvegarder();
  }

  // Cibles des quêtes en cours (pour la carte) : objectif suivant ou personnage à qui rendre la quête.
  function ciblesQuetes() {
    const monde = jeu.monde;
    if (!monde || monde.estDonjon || !jeu.quetes) return [];
    const def = monde.def;
    const centre = def.village?.position || [0, 0];
    const cibles = [];
    const pnjPos = (id) => {
      const p = donnees.pnj.get(id);
      return p && p.monde === def.id ? { x: centre[0] + p.position[0], z: centre[1] + p.position[1] } : null;
    };
    const zoneDe = (cible) => {
      const famille = cible.startsWith('famille:') ? cible.slice(8) : null;
      const zone = (def.zones || []).find((z) => z.monstres.some(([id]) => id === cible || donnees.monstres.get(id)?.famille === famille));
      return zone ? { x: zone.centre[0], z: zone.centre[1] } : null;
    };
    const lieu = (id) => (def.lieux || []).find((l) => l.id === id);
    for (const q of jeu.quetes.actives()) {
      if (q.monde !== def.id) continue;
      const nom = t(`${q.texte}.titre`);
      if (jeu.quetes.estFinie(q.id)) {
        const p = pnjPos(q.rendu);
        if (p) cibles.push({ ...p, nom });
        continue;
      }
      q.objectifs.forEach((o, i) => {
        if (jeu.quetes.avancement(q, i) >= (o.quantite || 1)) return;
        let p = null;
        if (o.type === 'explorer') { const l = lieu(o.cible); if (l) p = { x: l.position[0], z: l.position[1] }; }
        if (o.type === 'activer_tour' && def.tour) p = { x: def.tour.position[0], z: def.tour.position[1] };
        if (o.type === 'parler') p = pnjPos(o.cible);
        if (o.type === 'tuer') p = zoneDe(o.cible);
        if (o.type === 'collecter') {
          const source = [...donnees.monstres.values()].find((m) => donnees.butin.get(m.butin)?.quete?.some((e) => e.objet === o.cible));
          if (source) p = zoneDe(source.id);
        }
        if (o.type === 'ouvrir_coffre') { const c = def.coffres.find((x) => x.id === o.cible); if (c) p = { x: c.position[0], z: c.position[1] }; }
        if (o.type === 'terminer_donjon' || o.type === 'vaincre_boss') {
          const idDonjon = o.type === 'terminer_donjon' ? o.cible
            : [...donnees.donjons.values()].find((d) => d.salles.some((s) => s.boss === o.cible))?.id;
          const d = (def.donjons || []).find((x) => x.id === idDonjon);
          if (d) p = { x: d.position[0], z: d.position[1] };
        }
        if (p) cibles.push({ ...p, nom });
      });
    }
    return cibles;
  }

  function sauvegarder() {
    if (!jeu.enPartie || !jeu.monde) return null;
    const s = sauvegarde.construireSauvegarde(jeu.heros, jeu.monde, {
      tempsDeJeu: jeu.tempsDeJeu,
      options: jeu.options,
      progression: jeu.progression.serialiser(),
    });
    // Dans un donjon, on sauvegarde devant son entrée ; mort, au village.
    if (jeu.monde.estDonjon && jeu.retourDonjon) {
      Object.assign(s.position, { monde: jeu.retourDonjon.monde, x: jeu.retourDonjon.x, z: jeu.retourDonjon.z, y: 0, orientation: jeu.retourDonjon.angle });
    }
    if (jeu.heros.mort) {
      const village = villageDe(jeu.monde.estDonjon ? jeu.monde.def.monde : jeu.monde.def.id);
      Object.assign(s.position, { monde: village.def.id, x: village.x, z: village.z, y: 0 });
      s.personnage.vie = jeu.heros.stats.vieMax;
    }
    sauvegarde.ecrire(s);
    jeu.depuisSauvegarde = 0;
    return s;
  }

  function quitterPartie(revenirAuTitre) {
    if (jeu.enPartie) sauvegarder();
    jeu.desabonnements.forEach((d) => d());
    jeu.desabonnements = [];
    panneauOuvert()?.fermer(false);
    jeu.monde?.detruire();
    jeu.quetes?.detruire();
    jeu.hud?.detruire();
    jeu.surcouche?.detruire();
    jeu.suivi?.detruire();
    jeu.cartes?.detruire();
    jeu.triche?.detruire();
    jeu.pause?.fermer();
    afficherMort(false);
    Object.assign(jeu, { heros: null, monde: null, quetes: null, progression: null, hud: null, surcouche: null, suivi: null, cartes: null, triche: null, pause: null, panneau: null, cinematique: null, enPartie: false });
    entrees.definirActif(false);
    if (entrees.verrouille) entrees.liberer();
    if (revenirAuTitre) afficherTitre();
  }

  function ouvrirPause() {
    if (jeu.pause || !jeu.enPartie) return;
    sauvegarder();
    jeu.pause = afficherPause({
      options: jeu.options,
      surReprendre: () => {
        jeu.pause = null;
        entrees.verrouiller();
      },
      surExporter: () => {
        const s = sauvegarder();
        if (!s) return;
        try { sauvegarde.exporter(s); } catch { /* proposé en copie ci-dessous */ }
        texteACopier(t('pause.exporter'), t('export.explication'), JSON.stringify(s, null, 2));
      },
      surImporter: async (fermerMenu) => {
        try {
          const s = await sauvegarde.importer(donnees);
          sauvegarde.ecrire(s);
          fermerMenu();
          jeu.pause = null;
          jeu.enPartie = false;
          quitterPartie(false);
          demarrerDepuisSauvegarde(s);
          jeu.surcouche.message(t('msg.importOk'));
        } catch (e) {
          informer(t('msg.importErreur', { e: e.message }));
        }
      },
      surQuitter: () => {
        jeu.pause = null;
        quitterPartie(true);
      },
      surOptions: (options) => {
        jeu.camera.etat.sensibilite = options.sensibiliteSouris;
        jeu.camera.etat.inverserY = options.inverserY;
        rendu.definirBloom(options.bloom);
        appliquerDetails();
      },
    });
  }

  entrees.surChangementVerrouillage((verrouille) => {
    if (!jeu.enPartie) return;
    jeu.hud?.afficherCliquer(!verrouille && !jeu.panneau);
    if (!verrouille && !jeu.panneau) ouvrirPause();
    else if (verrouille && jeu.pause) {
      jeu.pause.fermer();
      jeu.pause = null;
    }
  });

  window.addEventListener('beforeunload', () => sauvegarder());
  document.addEventListener('visibilitychange', () => { if (document.hidden) sauvegarder(); });

  // ---------- Boucle de jeu ----------
  let precedent = performance.now();
  function boucle(maintenant = performance.now()) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, Math.max(0, (maintenant - precedent) / 1000));
    precedent = maintenant;

    if (jeu.enPartie) {
      const { heros, camera } = jeu;
      let monde = jeu.monde;
      const actif = entrees.verrouille && !jeu.pause && !jeu.panneau && !jeu.cinematique;
      if (actif) {
        jeu.tempsDeJeu += dt;
        if (entrees.vientDAppuyer('Tab') || entrees.souris.clicMilieu) monde.changerCible();
        const interaction = monde.interactionProche();
        if (!heros.mort) {
          if (entrees.vientDAppuyer('KeyE') && interaction) interaction.action();
          else if (entrees.vientDAppuyer('KeyI')) ouvrirInventaire(contexteUI());
          else if (entrees.vientDAppuyer('KeyJ')) ouvrirJournal(contexteUI());
          else if (entrees.vientDAppuyer('KeyM')) jeu.cartes.ouvrirGrandeCarte();
          else if (entrees.vientDAppuyer('KeyR')) potionRapide(heros, donnees);
          if (!heros.escalade) {
            if (entrees.souris.clicGauche || (entrees.souris.gauche && !heros.attaque)) utiliser(monde, heros.classe.attaqueBase, false);
            if (entrees.vientDAppuyer('Digit1') && heros.competencePrincipale) utiliser(monde, heros.competencePrincipale, true);
          }
        }
        monde = jeu.monde; // une interaction peut avoir changé de monde
        if (monde && !jeu.panneau) {
          const cible = monde.cible && !monde.cible.mort ? monde.cible.position : null;
          const vitesse = deplacerHeros(heros, dt, entrees, camera, monde.collisions, config, cible, monde.points?.tour, monde.terrain.niveauEau);
          if (!heros.escalade) repousserHeros(heros, monde);
          monde.mettreAJour(dt, vitesse);
        }
        jeu.depuisSauvegarde += dt;
        if (jeu.depuisSauvegarde >= config.sauvegarde.intervalle) sauvegarder();
      }
      monde = jeu.monde;
      if (jeu.cinematique) {
        // Vue panoramique autour de la tour.
        const c = jeu.cinematique;
        c.temps += dt;
        const a = c.temps * 0.9;
        rendu.camera.position.set(c.centre.x + Math.sin(a) * 70, c.centre.y + 25, c.centre.z + Math.cos(a) * 70);
        rendu.camera.lookAt(c.centre.x, c.centre.y - 15, c.centre.z);
        monde.mettreAJour(0, 0);
        monde.mettreAJourNature(dt);
        if (c.temps >= c.duree) jeu.cinematique = null;
      } else {
        camera.mettreAJour(actif ? dt : 0, actif ? entrees : { souris: { dx: 0, dy: 0, molette: 0 } }, heros.position, monde.cible?.position);
      }
      rendu.suivre(heros.position);
      const interaction = actif ? monde.interactionProche() : null;
      jeu.hud.mettreAJour(heros, monde, { interaction, boss: monde.logiqueDonjon?.bossActif() });
      jeu.surcouche.mettreAJour(actif ? dt : 0, monde, jeu.quetes);
      jeu.cartes.mettreAJour(dt);
      jeu.suivi.afficher(!jeu.cinematique);
      jeu.triche?.mettreAJour(dt);
    } else {
      cameraTitre.angle += dt * 0.05;
      rendu.camera.position.set(Math.sin(cameraTitre.angle) * 30, 12, Math.cos(cameraTitre.angle) * 30);
      rendu.camera.lookAt(0, 6, 0);
    }
    entrees.finDuTour();
    rendu.dessiner();
  }

  return {
    lancer() {
      rendu.definirAmbiance({ ciel: '#1a2236', brume: '#1a2236' }, 400);
      afficherTitre();
      boucle();
    },
    jeu,
    rendu,
    // Accès pour les tests automatiques.
    outils: { entrerDonjon: (id) => entrerDonjon(id), sortirDonjon: () => sortirDonjon(), voyager: (d) => voyager(d), destinations: () => destinations(), contexteUI: () => contexteUI(), sauvegarder: () => sauvegarder() },
  };
}

// Le héros ne traverse pas les monstres.
function repousserHeros(heros, monde) {
  for (const m of monde.monstres) {
    if (m.mort) continue;
    const dx = heros.position.x - m.position.x;
    const dz = heros.position.z - m.position.z;
    const d = Math.hypot(dx, dz);
    const minimum = heros.rayon + m.rayon;
    if (d > 0.001 && d < minimum && Math.abs(heros.position.y - m.position.y) < 1.5) {
      heros.position.x += (dx / d) * (minimum - d);
      heros.position.z += (dz / d) * (minimum - d);
    }
  }
}
