# État du projet ASTRÉA

Dernière mise à jour : 12 novembre 2026, étape 2 (monde 1 complet).

## Étape en cours

**Étape 2 — Monde 1 complet : terminée de mon côté, en attente de ton test de fin.**
Ensuite : **étape 1b — page admin** (repoussée après l'étape 2 à ta demande), puis **étape 3 — progression et butin**.

## Fait

### Étape 0 — Cadrage (validée le 12/11/2026)
Arborescence, formats des données, format de sauvegarde, risques : `docs/etape-0-cadrage.md`.

### Étape 1 — Prototype jouable
Écran titre, création du personnage (15 classes), héros en 3D, caméra, course, saut, roulade, blocage, combat en temps réel avec 1 compétence par classe, verrouillage, HUD, sauvegarde automatique, export et import, outil de test (`?debug=1`).

### Style visuel — cel-shading façon Breath of the Wild
Matériau maison (`src/moteur3d/materiaux.js`) : 3 tons nets, ombres bleu-violet, liseré lumineux sur les bords. Lumière chaude/froide, ciel en dégradé, brouillard pastel, bloom désactivable. Réglages dans `data/config.json` → `rendu`.

### Étape 2 — Monde 1 : Les Plaines de l'Aube
- **Monde ouvert de 3,2 km × 3,2 km** : collines, montagnes sur les bords, 2 rivières (on y avance plus lentement), environ 5 500 arbres et 1 400 rochers. Le sol est affiché par tronçons de 200 m, détaillés près du héros et simplifiés au loin.
- **Valdor**, le village unique : place pavée, puits, palissade, lanternes, 7 bâtiments de service et 4 maisons, portail de voyage.
  - **Les 9 services fonctionnent** :
    - auberge : 10 or pour récupérer toute sa vie et son mana ;
    - marchand, armurier, forgeronne et alchimiste : achat et vente ;
    - banque : dépôt et retrait de l'or ;
    - maître des compétences ;
    - tableau des quêtes : contrats de chasse ;
    - portail : voyage rapide.
  - **16 PNJ** : marchands, donneurs de quêtes et villageois qui se promènent. Un « ! » au-dessus d'un PNJ signale une quête à prendre, un « ? » une quête à rendre.
- **Carte et brouillard** :
  - la carte est cachée au départ ; un cercle de 60 m se dévoile autour du héros quand il marche ;
  - **mini-carte** en haut à droite, **grande carte** sur la touche M, avec légende et noms des lieux au survol.
- **Tour de l'Aube** (45 m) :
  - elle s'**escalade** : on marche contre la paroi ; Z monte, S descend, Q/D tourne autour, Espace saute ;
  - l'escalade consomme de l'endurance, et deux paliers permettent de souffler ;
  - au sommet, E sur la pierre d'éveil lance une **vue panoramique** et **révèle toute la carte** (relief, village, donjons, coffres visibles de loin) ;
  - la tour devient un **point de voyage rapide** : on clique dessus sur la grande carte, ou on passe par le portail de Valdor.
- **27 lieux à découvrir** (cercle de pierres, ruines, camps, ponts, lac, chêne millénaire, sanctuaire…). Un message s'affiche à chaque découverte et le lieu est noté sur la carte.
- **34 coffres**. Chacun ne s'ouvre qu'une fois, même après rechargement de la page. Certains sont visibles de loin une fois la tour activée.
- **5 familles de monstres** :
  - loups, avec le loup alpha (élite) ;
  - sangliers ;
  - frelons géants, qui volent ;
  - bandits, brutes et archers qui tirent de loin ;
  - gobelins, éclaireurs et chamans qui lancent des boules de feu.
  - Les attaques à distance sont annoncées par une ligne rouge et s'esquivent.
- **2 donjons**, faits de salles reliées par des couloirs. Une grille s'ouvre quand la salle est terminée.
  - **Grotte bourdonnante** : 2 salles de combat par vagues, une énigme de leviers (l'ordre est indiqué par les bannières au-dessus de la sortie), puis la Reine des frelons (élite) qui invoque des frelons.
  - **Repaire du Chef gobelin** : 2 salles de combat, une énigme à 4 leviers, puis le **boss Grukk, le Chef gobelin**.
    - Il a une grande barre de vie et des attaques annoncées (coup de massue en cône, charge en ligne).
    - **Sous 50 % de vie, il passe en phase 2** : il appelle 3 gobelins et gagne un tourbillon en cercle.
  - Chaque donjon a un coffre final. Un donjon terminé reste ouvert et vide, et le boss ne revient jamais.
- **10 quêtes**, avec journal (J) et suivi à l'écran : 2 principales, 3 secondaires, 2 de chasse, 2 de donjon et 1 légendaire.
  - Elles utilisent 8 types d'objectifs : découvrir, éveiller la tour, parler, vaincre, récupérer, ouvrir un coffre, terminer un donjon, vaincre un boss.
  - Les objectifs sont marqués d'un losange jaune sur la carte.
  - **Chaque récompense n'est donnée qu'une fois.**
- **Inventaire (I)** : 10 emplacements d'équipement et un sac de 40 places. On peut équiper, retirer, utiliser des potions et voir ses statistiques. Le modèle 3D du héros change avec son arme et son bouclier.
- **Potion rapide (R)** : boit la potion de vie la mieux adaptée.
- **59 objets** : une arme de Valdor par classe, 10 armures, 4 bijoux, 3 potions, des matériaux à vendre, des objets de quête et 2 objets uniques.
- **Mort** : retour au village, sans perte dans le monde 1.
- **Sauvegarde complète** : quêtes, carte (brouillard, tour, lieux), coffres, donjons, boss et banque. Dans un donjon, la partie est sauvegardée devant son entrée.

## Tests automatiques passés (navigateur sans écran)

- **Test de fin de l'étape 2** : nouvelle partie, carte entièrement dans le brouillard (0 case révélée). Escalade puis éveil de la tour : 100 % de la carte révélée. Les 10 quêtes faites dans l'ordre, les 2 donjons terminés (vagues, leviers, gardienne), le Chef gobelin vaincu avec passage en phase 2 et 3 renforts invoqués. ✓
- **Récompenses uniques** : rendre une quête deux fois ne donne rien, un coffre ouvert ne peut pas se rouvrir, et le boss n'est plus là quand on revient dans son donjon. ✓
- **Rechargement de la page** : on retrouve le niveau, l'or, les 10 quêtes terminées, la tour, les 2 donjons, les coffres ouverts et le boss vaincu. ✓
- **Fenêtres** : dialogue avec Elric et acceptation d'une quête, achat d'une arme puis équipement (l'attaque change), vente, banque, auberge, contrats, maître des compétences, journal, grande carte, voyage rapide par le portail. ✓
- `node outils/verifier.mjs` : 0 erreur.

## Reste à faire

- **Ton test de fin de l'étape 2** (voir « Comment tester » plus bas).
- Étape 1b : page admin.
- Étape 3 : progression et butin (les 4 autres compétences de chaque classe, raretés, forgeron qui améliore, effets complets).
- Étapes 4 à 9 : voir `docs/cahier-des-charges.md`.

## Bugs connus et limites actuelles

- **Performance réelle inconnue** : je n'ai mesuré qu'en rendu logiciel (1 à 2 images par seconde, sans carte graphique). Lance avec `?debug=1` et donne-moi tes FPS. Si ça rame, décoche le bloom dans Options.
- **Chargement du monde 1** : environ 10 s en rendu logiciel, sans doute 2 à 3 s sur un vrai PC.
- **Fines lignes au sol** entre un tronçon détaillé et un tronçon simplifié, visibles de haut (depuis la tour). À corriger à l'étape 7 (équilibrage et finitions).
- **Forgeronne** : elle vend des armes, mais l'amélioration d'armes arrive à l'étape 3. Elle le dit dans son dialogue.
- **Maître des compétences** : il affiche la compétence de ta classe. Les 4 autres arrivent à l'étape 3.
- **Pas de son** : c'est une option de l'étape 8.
- **Échap** : après l'avoir utilisé, le navigateur impose environ 1 s avant de pouvoir recapturer la souris. Si le jeu ne reprend pas, clique dedans.
- **Anciennes sauvegardes** : celles de l'étape 1 (zone de test) se chargent toujours dans la zone de test. Une nouvelle partie commence dans le monde 1.

## Décisions prises

- Nom du dépôt : `ASTR-A` (titre affiché : « ASTRÉA »).
- Données en JSON, textes par clés dans `data/textes/fr.json`.
- Three.js 0.187 copié dans `vendor/`, post-traitement dans `vendor/addons/`.
- Carte : 100 km² au total, 10 mondes d'environ 3,2 km de côté, chargés par tronçons.
- Page admin complète, enrichie à chaque étape. Totaux = minimums, sauf 1 village et 1 tour par monde.
- Au moins 25 lieux et 30 coffres par monde.
- Attaque = arme + 2 × stat ; défense des monstres = 2 + 1,5N ; critique = 5 % + 0,1 % par point de chance (max 50 %).
- **Rendu cel-shading obligatoire pour tout le monde d'ASTRÉA**.
- Touches lues par position physique (ZQSD en AZERTY = WASD en QWERTY).
  - **Étape 2 : E sert maintenant à interagir.** La compétence est seulement sur 1.
  - R pour la potion, I pour l'inventaire, J pour le journal, M pour la carte.
- **Monstres d'élite** (champ `elite` dans les données) : vie × 3 et XP × 3. Utilisé pour le loup alpha et la reine des frelons. Ils ne comptent pas comme boss.
- **Dialogues** : les données ne contiennent que les textes libres. Les quêtes à proposer ou à rendre et le service du PNJ sont ajoutés automatiquement d'après `quetes/*.json` et `pnj.json`. Ajouter une quête ne demande donc pas de modifier les dialogues.
- **Armes** : un héros ne peut équiper que la catégorie d'arme de sa classe. La forgeronne ne propose que l'arme de ta classe.
- **Donjons** : ce sont des niveaux séparés. On y entre par une arche dans le monde, et on en sort par le portail du hall ou par celui de la dernière salle une fois le donjon terminé.
- **Tableau des quêtes** : c'est un « PNJ objet » qui donne et reprend les contrats de chasse.
- Le prix de vente vaut 40 % du prix d'achat. Les objets de quête et les objets uniques ne se vendent pas.
- Les objets de quête ne tombent que si la quête est active et pas encore remplie.
- Au plus 3 monstres annoncent une attaque en même temps.
- La zone de test reste dans les données mais ne compte pas comme un monde.

## Totaux actuels (`node outils/verifier.mjs`)

| Élément | Actuel | Exigé |
|---|---|---|
| Classes | 15 | 15 minimum |
| Mondes | 1 | 10 exactement |
| Villages | 1 | 10 exactement |
| Tours | 1 | 10 exactement |
| Quêtes | 10 | 100 minimum |
| Donjons | 2 | 20 minimum |
| Familles de monstres | 5 | 50 minimum |
| Boss | 1 | 10 minimum |

Monde 1 : 27 lieux (25 minimum) et 34 coffres (30 minimum).

## Comment tester l'étape 2

1. Lance avec Live Server, en ajoutant `?debug=1` pour voir les FPS. **Nouvelle partie** (l'ancienne zone de test n'est plus le point de départ).
2. Tu apparais à Valdor. Regarde la mini-carte : tout est caché sauf autour de toi.
3. Parle à **Elric** (le vieil homme au « ! » près du puits) avec **E** et accepte « La marque de la relique ».
4. Va au **Cercle de pierres** (losange jaune sur la carte, touche M), puis à la **Tour de l'Aube**. Marche contre la tour pour l'escalader, souffle sur les paliers, et appuie sur E au sommet : toute la carte apparaît.
5. Reviens voir Elric (« ? » au-dessus de lui) et rends la quête. Essaie le voyage rapide avec Sylva (le portail) ou en cliquant sur la tour dans la grande carte.
6. Enchaîne les quêtes : les PNJ avec « ! », le tableau des contrats, puis les donjons. Le Repaire du Chef gobelin est au sud, conseillé à partir du niveau 9.
7. Tu peux utiliser l'outil de test (+1 niveau, +100 or) pour aller plus vite.
8. Dis-moi tes FPS, ce qui est trop dur ou trop facile, et les bugs.
