# ASTRÉA — Les Chroniques des Royaumes Oubliés

Jeu d'aventure et de rôle fantasy en 3D, solo et en monde ouvert, jouable dans le navigateur (HTML, CSS, JavaScript, Three.js).

15 classes • 10 mondes • 10 villages • 100 quêtes • 20 donjons • niveau 100

## État

En développement : étape 2 (monde 1 complet : Valdor, tour, brouillard, 2 donjons, boss, 10 quêtes). Voir [ETAT.md](ETAT.md).

## Lancer le jeu

Le jeu utilise des modules JavaScript, il faut donc un petit serveur local :

- **VS Code** : extension *Live Server*, puis clic droit sur `index.html` → *Open with Live Server* ;
- ou en ligne via **GitHub Pages**.

Ajoute `?debug=1` à l'adresse pour afficher l'outil de test (FPS, triche).

## Commandes

| Action | Touche |
|---|---|
| Se déplacer | ZQSD (AZERTY) ou WASD (QWERTY) |
| Courir | Maj gauche |
| Sauter | Espace |
| Roulade d'esquive | C |
| Attaquer | Clic gauche |
| Bloquer | Clic droit |
| Compétence | 1 |
| Interagir (parler, ouvrir, éveiller) | E |
| Potion de vie | R |
| Inventaire | I |
| Journal de quêtes | J |
| Carte | M |
| Verrouiller une cible | Tab ou clic molette |
| Menu | Échap |

Escalade : marche contre la paroi d'une tour, puis Z/S pour monter/descendre, Q/D pour tourner autour, Espace pour sauter.

## Vérifier le contenu

`node outils/verifier.mjs`, ou ouvrir `outils/verification.html` avec le serveur local.

## Documentation

- [Cahier des charges](docs/cahier-des-charges.md)
- [Cadrage technique (étape 0)](docs/etape-0-cadrage.md)
