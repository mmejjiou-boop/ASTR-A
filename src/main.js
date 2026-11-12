// Point d'entrée : charge les données puis lance le jeu.
import { chargerDonnees } from './core/donnees.js';
import { definirTextes } from './core/textes.js';
import { creerJeu } from './core/jeu.js';

const chargement = document.getElementById('chargement');

try {
  const donnees = await chargerDonnees('./data/');
  definirTextes(donnees.textes);
  const application = creerJeu(donnees);
  application.lancer();
  chargement.remove();
  // Accès pour les tests automatiques et la console du navigateur.
  window.astrea = application;
} catch (erreur) {
  console.error(erreur);
  chargement.classList.add('erreur');
  chargement.textContent = window.location.protocol === 'file:'
    ? 'ASTRÉA doit être lancé avec un serveur local (par exemple Live Server dans VS Code),\npas en ouvrant le fichier directement.'
    : `Erreur au chargement du jeu :\n${erreur.message}`;
}
