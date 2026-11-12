// Chef d'orchestre : écrans, démarrage d'une partie, boucle de jeu, sauvegarde automatique.
import { creerRendu } from '../moteur3d/rendu.js';
import { creerEntrees } from '../moteur3d/entrees.js';
import { creerCamera } from '../moteur3d/camera.js';
import { creerMonde } from '../monde/monde.js';
import { Heros, nouveauProfil } from '../entites/heros.js';
import { deplacerHeros } from '../systemes/deplacement.js';
import { utiliser } from '../systemes/competences.js';
import { afficherEcranTitre } from '../ui/ecranTitre.js';
import { afficherCreation } from '../ui/creationPersonnage.js';
import { creerHud } from '../ui/hud.js';
import { creerSurcouche } from '../ui/surcouche.js';
import { afficherPause } from '../ui/menuPause.js';
import { el, ui } from '../ui/dom.js';
import { t } from './textes.js';
import { ecouter } from './evenements.js';
import * as sauvegarde from './sauvegarde.js';
import { debugActif, creerTriche } from '../../outils/triche.js';

const OPTIONS_PAR_DEFAUT = { sensibiliteSouris: 1, inverserY: false, volume: 0.8, bloom: true };

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
    hud: null,
    surcouche: null,
    triche: null,
    pause: null,
    ecranMort: null,
    tempsDeJeu: 0,
    depuisSauvegarde: 0,
    options: { ...OPTIONS_PAR_DEFAUT },
    enPartie: false,
    desabonnements: [],
  };

  // Mouvement lent de la caméra derrière l'écran titre.
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
          window.alert(t('msg.importErreur', { e: e.message }));
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

  function demarrer(profil, s) {
    quitterPartie(false);
    const heros = new Heros(donnees, profil);
    heros.debloquerCompetences();
    const idMonde = s?.position.monde || 'test';
    const defMonde = donnees.mondes.get(idMonde);
    // La caméra interroge le terrain du monde pour ne pas passer sous le sol.
    let monde = null;
    const camera = creerCamera(rendu.camera, config, { hauteur: (x, z) => (monde ? monde.collisions.hauteur(x, z) : 0) });
    monde = creerMonde(donnees, rendu, defMonde, heros, camera);
    camera.etat.sensibilite = jeu.options.sensibiliteSouris;
    camera.etat.inverserY = jeu.options.inverserY;
    rendu.definirBloom(jeu.options.bloom);
    if (s) monde.placerHeros(s.position.x, s.position.z, s.position.orientation);
    else monde.placerHeros(defMonde.depart[0], defMonde.depart[1], 0);
    rendu.camera.position.set(heros.position.x, heros.position.y + 4, heros.position.z - 7);

    Object.assign(jeu, { heros, monde, camera, enPartie: true, depuisSauvegarde: 0 });
    if (!s) jeu.tempsDeJeu = 0;
    jeu.hud = creerHud();
    jeu.surcouche = creerSurcouche(rendu.camera);
    if (debugActif()) jeu.triche = creerTriche(jeu);
    entrees.definirActif(true);
    jeu.hud.afficherCliquer(!entrees.verrouille);
    if (!sauvegarde.stockageDisponible()) jeu.surcouche.message(t('msg.stockage'), false);

    // Sauvegardes déclenchées par les moments importants.
    jeu.desabonnements.push(
      ecouter('monstreTue', () => sauvegarder()),
      ecouter('niveau', () => sauvegarder()),
      ecouter('mortHeros', () => afficherMort(true)),
      ecouter('reapparition', () => {
        afficherMort(false);
        jeu.surcouche.message(t('msg.reapparition'));
        sauvegarder();
      }),
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

  function sauvegarder() {
    if (!jeu.enPartie) return null;
    const s = sauvegarde.construireSauvegarde(jeu.heros, jeu.monde, {
      tempsDeJeu: jeu.tempsDeJeu,
      options: jeu.options,
    });
    // Mort : on sauvegarde au point de départ, pas sur place.
    if (jeu.heros.mort) {
      s.position.x = jeu.monde.def.depart[0];
      s.position.z = jeu.monde.def.depart[1];
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
    jeu.monde?.detruire();
    jeu.hud?.detruire();
    jeu.surcouche?.detruire();
    jeu.triche?.detruire();
    jeu.pause?.fermer();
    afficherMort(false);
    Object.assign(jeu, { heros: null, monde: null, hud: null, surcouche: null, triche: null, pause: null, enPartie: false });
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
        // Peut échouer si le navigateur refuse (délai après Échap) : on affiche alors « Clique pour jouer ».
        try { entrees.verrouiller()?.catch?.(() => {}); } catch { /* « Clique pour jouer » reste affiché */ }
      },
      surExporter: () => {
        const s = sauvegarder();
        if (s) sauvegarde.exporter(s);
      },
      surImporter: async (fermerMenu) => {
        try {
          const s = await sauvegarde.importer(donnees);
          sauvegarde.ecrire(s);
          fermerMenu();
          jeu.pause = null;
          jeu.enPartie = false; // la partie actuelle est remplacée, on ne l'enregistre pas par-dessus
          quitterPartie(false);
          demarrerDepuisSauvegarde(s);
          jeu.surcouche.message(t('msg.importOk'));
        } catch (e) {
          window.alert(t('msg.importErreur', { e: e.message }));
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
      },
    });
  }

  entrees.surChangementVerrouillage((verrouille) => {
    if (!jeu.enPartie) return;
    jeu.hud?.afficherCliquer(!verrouille);
    if (!verrouille) ouvrirPause();
    else if (jeu.pause) {
      jeu.pause.fermer();
      jeu.pause = null;
    }
  });

  window.addEventListener('beforeunload', () => sauvegarder());
  document.addEventListener('visibilitychange', () => { if (document.hidden) sauvegarder(); });

  // Boucle de jeu.
  let precedent = performance.now();
  function boucle(maintenant = performance.now()) {
    requestAnimationFrame(boucle);
    const dt = Math.min(0.05, Math.max(0, (maintenant - precedent) / 1000));
    precedent = maintenant;

    if (jeu.enPartie) {
      const actif = entrees.verrouille && !jeu.pause;
      const { heros, monde, camera } = jeu;
      if (actif) {
        jeu.tempsDeJeu += dt;
        if (entrees.vientDAppuyer('Tab') || entrees.souris.clicMilieu) monde.changerCible();
        if (!heros.mort) {
          if (entrees.souris.clicGauche || (entrees.souris.gauche && !heros.attaque)) utiliser(monde, heros.classe.attaqueBase, false);
          if ((entrees.vientDAppuyer('Digit1') || entrees.vientDAppuyer('KeyE')) && heros.competencePrincipale) {
            utiliser(monde, heros.competencePrincipale, true);
          }
        }
        const cible = monde.cible && !monde.cible.mort ? monde.cible.position : null;
        const vitesse = deplacerHeros(heros, dt, entrees, camera, monde.collisions, config, cible);
        repousserHeros(heros, monde);
        monde.mettreAJour(dt, vitesse);
        jeu.depuisSauvegarde += dt;
        if (jeu.depuisSauvegarde >= config.sauvegarde.intervalle) sauvegarder();
      }
      camera.mettreAJour(actif ? dt : 0, actif ? entrees : { souris: { dx: 0, dy: 0, molette: 0 } }, heros.position, monde.cible?.position);
      rendu.suivre(heros.position);
      jeu.hud.mettreAJour(heros, monde);
      jeu.surcouche.mettreAJour(actif ? dt : 0, monde);
      jeu.triche?.mettreAJour(dt);
    } else {
      // Écran titre : pas de monde chargé, la caméra tourne doucement.
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
