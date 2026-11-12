# ASTRÉA — Les Chroniques des Royaumes Oubliés

Ce fichier est relu au début de chaque session. Il remplace le « contexte permanent » à coller.

## Comment on travaille

- Projet de Mohamed Amine (étudiant DWWM). Il teste, décide et valide. Claude code.
- On avance **une étape à la fois**, dans l'ordre de `docs/cahier-des-charges.md` (étapes 0 à 9). On ne passe à l'étape suivante qu'après validation du « test de fin » par Mohamed Amine.
- Au début de chaque session : lire `ETAT.md`, puis `docs/etape-0-cadrage.md` (formats validés), puis le code concerné.
- À la fin de chaque étape : mettre `ETAT.md` à jour (fait, reste à faire, bugs connus, décisions prises), lancer la vérification, donner la marche à suivre pour tester, faire un commit.
- Toujours répondre en français, simplement. Expliquer les choix techniques en une ou deux phrases : le projet sert aussi au portfolio.

## Décisions fixées (ne pas les remettre en question)

- Plateforme : navigateur sur ordinateur, clavier et souris. HTML, CSS et JavaScript (modules ES), sans installation pour le joueur. Three.js autorisé (copie locale dans `vendor/`). Lancement via un petit serveur local (Live Server) ou GitHub Pages.
- Vue : 3D à la troisième personne, caméra orbitale à la souris.
- Déplacements : marcher, courir (jauge d'endurance), sauter, roulade d'esquive, escalade des tours et des parois marquées.
- Combat en temps réel : attaque, compétences, esquive, blocage, verrouillage de la cible.
- Jeu solo avec PNJ. Sauvegarde locale dans le navigateur + export/import d'un fichier. Pas de serveur avant l'étape 9.
- Graphismes : 3D low poly générée par le code. Aucun modèle, image, musique ou police téléchargé ou protégé. Inspiré de Zelda BotW sans rien reprendre de Nintendo.
- Chaque monde est une zone ouverte traversable à pied en 3 à 5 minutes, reliée aux autres par des portails. Le jeu doit rester fluide.
- Langue : français. Tous les textes affichés sont dans `data/textes/fr.json`.
- Tout le contenu est dans `data/`. Ajouter un monde ne demande pas de nouveau code.

## Règles de travail

- Tout ce qui est affiché fonctionne. Pas de bouton décoratif, pas de faux joueurs, pas de fausse sauvegarde.
- Si une chose est impossible, le dire au lieu de la simuler.
- Fichiers complets, jamais « reste du code inchangé ».
- Maintenir `outils/verification.html` (et `outils/verifier.mjs`) qui compte le contenu et signale tout écart avec les totaux exigés.
- Ne pas modifier ce qui fonctionne sans le signaler.

## Totaux exigés à la fin

15 classes, niveau max 100 · exactement 10 mondes et 10 villages (1 par monde) · 100 quêtes (20 principales, 30 secondaires, 20 chasse, 15 donjon, 15 légendaires) · 20 donjons · 50 familles de monstres · 10 boss · 10 tours.

## Formules

- XP du niveau n à n+1 : `round(100 × n^1,5)`.
- Par niveau : +5 % vie et mana de base, +2 stat principale, +1 autres stats.
- Dégâts : `max(1, attaque × coef − défense ÷ 2)`, ±10 %, critique × 1,5.
- Monstre niveau N : vie `40 + 22N`, attaque `6 + 2,4N`, XP `12 + 5N`. Boss : vie × 12, XP × 20.
- Rareté : commun 60 %, inhabituel 25 %, rare 10 %, épique 4 %, légendaire 0,9 %, mythique 0,1 %.
- Mort : retour au village du monde, −5 % de l'or porté, rien d'autre. Aucune pénalité dans le monde 1.

Les détails (histoire, classes, mondes, répartition des quêtes, carte et tours) sont dans `docs/cahier-des-charges.md`. Les formats de données et les décisions complémentaires sont dans `docs/etape-0-cadrage.md`.
