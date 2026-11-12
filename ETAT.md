# État du projet ASTRÉA

Dernière mise à jour : 12 novembre 2026, étape 1 (prototype jouable).

## Étape en cours

**Étape 1 — Prototype jouable : terminée de mon côté, en attente de ton test de fin.**
Ensuite : **étape 1b — page admin**, puis **étape 2 — monde 1 complet**.

## Fait

### Étape 0 — Cadrage (validée le 12/11/2026)
- Arborescence, formats des données, format de sauvegarde, risques : `docs/etape-0-cadrage.md`.

### Étape 1 — Prototype jouable
- Écran titre : « Nouvelle partie », « Continuer » (seulement si une sauvegarde valide existe), « Importer une sauvegarde ».
- Création du personnage : nom (2 à 16 caractères) et choix parmi les 15 classes, avec une fiche (rôle, forces, faiblesses, statistiques, première compétence).
- Zone de test en 3D (400 m × 400 m) : relief généré par graine, ~260 arbres et ~90 rochers avec collisions, bords en collines.
- Héros low poly aux couleurs de sa classe, avec son arme (et un bouclier pour le chevalier et le paladin).
- Caméra orbitale à la souris, zoom à la molette, vue par-dessus l'épaule quand une cible est verrouillée.
- Déplacements : marche, course (jauge d'endurance, épuisement), saut, roulade d'esquive (invincible pendant 0,35 s), blocage au clic droit (−75 % de dégâts de face, coûte de l'endurance).
- 2 types de monstres : loup gris (meute : toute la meute attaque ensemble) et gobelin éclaireur. Ils patrouillent, te repèrent, te poursuivent, abandonnent s'ils s'éloignent trop, puis reviennent. Ils réapparaissent 60 s après leur mort.
- Attaques des monstres **annoncées au sol** (zone rouge) : on peut les esquiver.
- Combat : attaque de base par classe (corps à corps ou à distance), 1 compétence par classe, verrouillage (Tab ou clic molette), aide à la visée, temps de recharge, mana, effets (brûlure, malédiction, saignement, ralentissement, étourdissement), vol de vie, soin, bouclier.
- Formules du cahier des charges appliquées (XP, dégâts, critiques, stats des monstres).
- HUD : vie, mana, endurance, niveau, XP, or, compétence avec recharge, cible verrouillée, effets actifs. Barres de vie au-dessus des monstres et nombres de dégâts.
- Mort : retour au point de départ, sans pénalité dans la zone de test et le monde 1.
- Menu pause (Échap) : reprendre, exporter, importer, options (sensibilité souris, inverser l'axe vertical), écran titre.
- Sauvegarde automatique : toutes les 30 s, à chaque monstre tué, montée de niveau, pause, fermeture de la page.
- Outil de test avec `?debug=1` : FPS, position, +1 niveau, +100 or, soin, tuer les monstres proches.
- Vérification du contenu : `node outils/verifier.mjs` ou `outils/verification.html`.

## Tests automatiques passés (navigateur sans écran)

- Créer un personnage, tuer un loup, recharger la page, « Continuer » : même nom, classe, XP, or et position. ✓
- Les 15 compétences : dégâts, effets, soin ou bouclier vérifiés pour chaque classe. ✓
- Roulade, saut, mort et réapparition, menu pause, export de la sauvegarde, options, retour à l'écran titre, « Continuer ». ✓
- Aucune erreur JavaScript.

## Reste à faire

- **Ton test de fin de l'étape 1** (voir « Comment tester » plus bas).
- Étape 1b : page admin (classes, compétences, monstres, objets, textes, réglages).
- Étape 2 : monde 1 complet (3,2 km, chargement par tronçons, Valdor, tour, brouillard, 10 quêtes, 2 donjons, boss).
- Étapes 3 à 9 : voir `docs/cahier-des-charges.md`.

## Bugs connus et limites actuelles

- **Performance réelle inconnue** : je n'ai mesuré qu'en rendu logiciel, qui est lent. Lance avec `?debug=1` et donne-moi ton nombre de FPS.
- L'escalade n'existe pas encore : elle arrive avec la tour à l'étape 2. Les pentes trop raides bloquent la marche.
- Les 3 petites potions de l'inventaire de départ ne sont pas encore utilisables : l'inventaire arrive à l'étape 3. Elles ne sont affichées nulle part pour l'instant.
- Pas de son (c'est une option de l'étape 8).
- Après Échap, le navigateur impose environ 1 s avant de pouvoir recapturer la souris. Si « Reprendre » ne la capture pas, clique dans le jeu.

## Décisions prises

- Nom du dépôt : `ASTR-A` (titre affiché : « ASTRÉA »).
- Données en JSON, textes par clés dans `data/textes/fr.json`.
- Three.js 0.187 copié dans `vendor/`. Le jeu se lance via Live Server ou GitHub Pages.
- Carte : 100 km² au total, 10 mondes d'environ 3,2 km de côté, chargés par tronçons.
- Page admin complète, enrichie à chaque étape. Totaux = minimums, sauf 1 village et 1 tour par monde.
- Au moins 25 lieux et 30 coffres par monde.
- Attaque = arme + 2 × stat ; défense des monstres = 2 + 1,5N ; critique = 5 % + 0,1 %/chance (max 50 %).
- 5ᵉ famille du monde 1 : frelons géants. Un seul emplacement de sauvegarde.
- Touches lues par position physique : ZQSD en AZERTY équivaut à WASD en QWERTY. Roulade sur **C** et pas sur Ctrl, car Ctrl+W ferme l'onglet. Compétence sur **1** ou **E**.
- Ajout des dossiers `src/entites/` (héros, monstre) et `src/monde/monde.js` (fait vivre un monde à partir de ses données).
- La zone de test (`data/mondes/zone-test.json`) ne compte pas dans les 10 mondes.
- Au plus 3 monstres annoncent une attaque en même temps, pour que les combats restent lisibles.

## Totaux actuels (`node outils/verifier.mjs`)

| Élément | Actuel | Exigé |
|---|---|---|
| Classes | 15 | 15 minimum |
| Mondes | 0 | 10 exactement |
| Villages | 0 | 10 exactement |
| Tours | 0 | 10 exactement |
| Quêtes | 0 | 100 minimum |
| Donjons | 0 | 20 minimum |
| Familles de monstres | 2 | 50 minimum |
| Boss | 0 | 10 minimum |

Compétences : 1 sur 5 par classe (les 4 autres arrivent à l'étape 3).

## Comment tester l'étape 1

1. Ouvre le dossier dans VS Code, clic droit sur `index.html` → *Open with Live Server*. Ajoute `?debug=1` à la fin de l'adresse pour voir les FPS.
2. **Nouvelle partie** → entre un nom, choisis une classe → **Commencer l'aventure**.
3. Clique dans le jeu pour capturer la souris. Les loups sont à l'est (x 70, z 40), les gobelins au sud-ouest (x −70, z −60).
4. Approche-toi d'un monstre. **Tab** pour verrouiller, **clic gauche** pour attaquer, **1** pour la compétence, **C** pour esquiver les zones rouges, **clic droit** pour bloquer.
5. Tue un monstre (tu gagnes de l'XP et de l'or), puis **recharge la page** (F5) et clique sur **Continuer** : tu dois retrouver ton niveau, ton XP, ton or et ta position.
6. Dis-moi tes FPS, ce qui te gêne (caméra, vitesse, saut, difficulté) et les bugs que tu trouves.
