**ASTRÉA**

**LES CHRONIQUES DES ROYAUMES OUBLIÉS**

Prompt amélioré (version 3) : aventure solo en 3D, carte découverte grâce aux tours

15 classes • 10 mondes • exactement 10 villages • 100 quêtes • 20 donjons • niveau 100

# Ce qui change dans cette version 3

- **Tout en 3D.** Héros à la troisième personne, caméra à la souris, monde ouvert à explorer à pied, comme un petit Zelda Breath of the Wild.

- **Une carte à découvrir.** Au départ, la carte est couverte de brouillard. Il faut trouver et escalader la tour de chaque monde pour révéler sa région. La tour sert ensuite de point de voyage rapide.

- **Un jeu solo avec des PNJ.** Villageois, marchands, donneurs de quêtes et personnages de l'histoire, sans multijoueur.

- **Les choix sont faits.** La version 1 laissait l'IA décider (« temps réel ou tour par tour », « isométrique ou troisième personne », « si la plateforme le permet »). Chaque « ou » est une occasion pour l'IA de changer d'avis en cours de route. Cette version fixe tout.

- **Un prompt par étape.** Un seul prompt géant donne un résultat superficiel. Ici : un contexte court à coller à chaque session, puis un prompt par étape.

- **Un fichier de suivi.** L'IA oublie tout d'une session à l'autre. Elle tient donc à jour un fichier ETAT.md que tu recolles au début de la session suivante.

- **Des formules chiffrées.** L'expérience, les dégâts et le butin sont définis par des formules, pour que l'équilibrage reste cohérent d'une étape à l'autre.

- **Un périmètre honnête.** Le jeu est d'abord un RPG solo complet. Le multijoueur en ligne passe en dernière étape, parce qu'il demande un serveur que l'IA ne peut pas fournir.

- **Rien n'est supprimé.** Les systèmes secondaires de la version 1 (métiers, faim et soif, météo, talents) sont déplacés en options, à ajouter un par un quand le jeu de base fonctionne.

# Mode d'emploi

- Ouvre une nouvelle session avec ton IA de création. Colle le bloc « Contexte permanent », puis le prompt de l'étape en cours.

- À partir de l'étape 1, colle aussi le contenu du fichier ETAT.md et les fichiers du projet (ou donne l'accès au dossier).

- Teste toi-même le « test de fin » de l'étape avant de passer à la suivante. Si un test échoue, demande la correction dans la même session.

- Ne saute pas d'étape et n'en demande pas deux à la fois.

# Contexte permanent — à coller au début de chaque session

> Tu développes ASTRÉA, un jeu d'aventure et de rôle fantasy en 3D, solo, en monde ouvert, inspiré de Zelda Breath of the Wild, sans reprendre aucun nom, personnage, musique ni graphisme de Nintendo. Tu travailles par étapes : je te donne une seule étape à la fois.
>
> DÉCISIONS FIXÉES (ne les remets pas en question)
>
> \- Plateforme : navigateur sur ordinateur, clavier et souris. HTML, CSS et JavaScript, sans installation. La bibliothèque Three.js est autorisée.
>
> \- Vue : 3D à la troisième personne, caméra orbitale contrôlée à la souris.
>
> \- Déplacements : marcher, courir (jauge d'endurance), sauter, roulade d'esquive, escalade des tours et des parois marquées.
>
> \- Combat en temps réel : attaque, compétences, esquive, blocage et verrouillage de la cible.
>
> \- Jeu solo avec des PNJ (villageois, marchands, donneurs de quêtes, personnages de l'histoire). Sauvegarde locale dans le navigateur, avec export et import d'un fichier de sauvegarde. Pas de serveur avant l'étape 9.
>
> \- Graphismes : 3D low poly générée par le code (formes simples, couleurs franches, éclairage et ombres soignés). Aucun modèle 3D, image, musique ou police téléchargé ou protégé.
>
> \- Chaque monde est une zone 3D ouverte qu'on traverse à pied en 3 à 5 minutes. Les mondes sont reliés par des portails. Le jeu doit rester fluide dans un navigateur.
>
> \- Langue : français. Tous les textes sont regroupés dans un fichier, pour pouvoir traduire plus tard.
>
> \- Tout le contenu (classes, compétences, monstres, objets, quêtes, mondes, donjons) est dans des fichiers de données séparés du code. Ajouter un monde ne doit pas demander de nouveau code.
>
> RÈGLES DE TRAVAIL
>
> \- Tout ce qui est affiché doit fonctionner. Pas de bouton décoratif, pas de faux joueurs en ligne, pas de fausse sauvegarde.
>
> \- Si tu ne peux pas faire quelque chose, dis-le clairement au lieu de le simuler.
>
> \- Livre des fichiers complets, jamais des extraits avec « reste du code inchangé ».
>
> \- À la fin de chaque étape : mets à jour ETAT.md (fait, reste à faire, bugs connus, décisions prises) et donne-moi la marche à suivre pour tester.
>
> \- Maintiens un script de vérification qui compte le contenu et signale tout écart avec les totaux exigés.
>
> \- Ne modifie pas ce qui fonctionne déjà sans me le dire.
>
> CARTE, BROUILLARD ET TOURS
>
> \- Au début du jeu, la carte de chaque monde est entièrement couverte de brouillard. Seul un petit cercle autour du joueur se dévoile quand il marche, et les lieux visités sont notés sur la carte.
>
> \- Chaque monde possède exactement une tour d'observation, visible de loin. Pour l'activer, le joueur doit l'atteindre, l'escalader (escalade avec endurance, plateformes ou chemin en spirale) et interagir avec son sommet.
>
> \- Activer la tour lance une courte vue panoramique, puis révèle la carte de toute la région : relief, chemins, village, donjons, coffres visibles de loin et lieux d'intérêt.
>
> \- Une tour activée devient un point de voyage rapide. Le voyage rapide n'est possible que vers les tours activées et les villages déjà visités.
>
> \- La mini-carte suit les mêmes règles que la grande carte.
>
> \- Difficulté croissante : tour facile et sans danger dans le monde 1 ; dans les mondes suivants, tour gardée par des monstres, entourée d'obstacles ou demandant de résoudre une petite énigme.
>
> \- Les tours sont inhabitées : elles ne comptent pas comme des villages.
>
> \- L'état de la carte (zones révélées, tours activées, lieux visités) fait partie de la sauvegarde.
>
> TOTAUX EXIGÉS À LA FIN (ni plus, ni moins pour les villages)
>
> \- 15 classes ; niveau maximum 100.
>
> \- Exactement 10 mondes et exactement 10 villages : un seul village par monde. Les camps, ruines et avant-postes sont inhabités et n'offrent aucun service.
>
> \- 100 quêtes : 20 principales, 30 secondaires, 20 de chasse, 15 de donjon, 15 légendaires.
>
> \- 20 donjons (2 par monde) ; 50 familles de monstres (5 par monde) ; 10 boss de monde ; 10 tours d'observation (1 par monde).
>
> HISTOIRE
>
> Il y a mille ans, un pacte liait les royaumes d'ASTRÉA. Le Roi du Néant l'a brisé, a corrompu les terres et ouvert des passages vers des dimensions hostiles. Le joueur, marqué par une relique oubliée, découvre la vérité au fil des 20 quêtes principales, de Valdor jusqu'au Royaume céleste.
>
> FORMULES
>
> \- Expérience pour passer du niveau n au niveau n+1 : 100 × n^1,5, arrondi.
>
> \- Par niveau : +5 % de vie et de mana de base, +2 dans la statistique principale de la classe, +1 dans les autres.
>
> \- Dégâts = max(1, attaque × coefficient de la compétence − défense ÷ 2), avec ±10 % de hasard. Coup critique : × 1,5.
>
> \- Monstre de niveau N : vie = 40 + 22 × N ; attaque = 6 + 2,4 × N ; expérience donnée = 12 + 5 × N. Boss : vie × 12, expérience × 20.
>
> \- Chance de rareté d'un objet : commun 60 %, inhabituel 25 %, rare 10 %, épique 4 %, légendaire 0,9 %, mythique 0,1 %.
>
> \- Mort : retour au village du monde, perte de 5 % de l'or porté, aucune perte d'objet ni d'expérience. Aucune pénalité dans le monde 1.
>
> STATISTIQUES : force, intelligence, agilité, endurance, défense, chance, points de vie, mana.
>
> ÉQUIPEMENT : tête, torse, jambes, bottes, gants, arme principale, arme secondaire, collier, deux anneaux.
>
> SERVICES DE CHAQUE VILLAGE : auberge, marchand général, armurier, forgeron, alchimiste, banque, maître des compétences, tableau des quêtes, portail de voyage.
>
> LES 15 CLASSES, LES 10 MONDES ET LA RÉPARTITION DES QUÊTES : voir les listes que je colle à la suite.

## Liste à coller : les 15 classes

Chaque classe a une arme de prédilection, 3 compétences actives, 1 passive et 1 ultime. Aucune classe ne doit être meilleure que les autres dans toutes les situations.

| **Classe**    | **Rôle et style de jeu**                |
|---------------|-----------------------------------------|
| Chevalier     | Tank, épée et bouclier, parade          |
| Sorcier       | Magie élémentaire, projectiles et zones |
| Mage noir     | Malédictions, dégâts sur la durée       |
| Archer        | Distance, tirs chargés                  |
| Assassin      | Mobilité, furtivité, coups critiques    |
| Paladin       | Défense sacrée, soins limités           |
| Berserker     | Gros dégâts physiques, rage             |
| Druide        | Soins, racines, transformation          |
| Nécromancien  | Squelettes invoqués, drain de vie       |
| Prêtre        | Soins, boucliers, bénédictions          |
| Samouraï      | Katana, contre-attaques, combos         |
| Invocateur    | Créatures alliées, contrôle             |
| Chasseur      | Arc, pièges, compagnon animal           |
| Élémentaliste | Feu, eau, terre, foudre                 |
| Paladin noir  | Drain de vie, sacrifices                |

## Liste à coller : les 10 mondes

| **N°** | **Monde**              | **Village unique** | **Niveaux** | **Décor et ennemis**                                     | **Boss du monde**          |
|--------|------------------------|--------------------|-------------|----------------------------------------------------------|----------------------------|
| 1      | Les Plaines de l'Aube  | Valdor             | 1–10        | Prairies, rivières. Loups, sangliers, gobelins, bandits. | Chef gobelin               |
| 2      | La Forêt noire         | Sylvaris           | 10–20       | Arbres géants, brume. Araignées, loups maudits, ents.    | Ancien de la forêt maudite |
| 3      | Les Montagnes gelées   | Frostheim          | 20–30       | Glaciers, tempêtes. Yétis, loups de glace, golems.       | Dragon blanc éternel       |
| 4      | Le Désert des damnés   | Sablemort          | 30–40       | Dunes, pyramides. Scorpions, momies, serpents.           | Pharaon maudit             |
| 5      | Les Marais toxiques    | Marécaille         | 40–50       | Eaux troubles. Zombies, plantes carnivores.              | Reine des marais           |
| 6      | Le Royaume des elfes   | Élarion            | 50–60       | Forêts lumineuses. Esprits, fées corrompues.             | Gardien éternel            |
| 7      | Les Terres volcaniques | Cendral            | 60–70       | Lave, cendres. Démons, salamandres.                      | Seigneur des flammes       |
| 8      | Le Royaume des morts   | Nécropolis         | 70–80       | Cryptes, châteaux hantés. Squelettes, vampires.          | Roi des morts              |
| 9      | Les Plaines des géants | Géantide           | 80–90       | Canyons, ruines géantes. Trolls, ogres, colosses.        | Titan ancestral            |
| 10     | Le Royaume céleste     | Astérion           | 90–100      | Îles flottantes. Anges déchus, gardiens célestes.        | Roi du Néant (boss final)  |

## Liste à coller : la répartition des 100 quêtes

Chaque monde contient exactement 10 quêtes :

- 2 principales, 3 secondaires et 2 de chasse dans chaque monde ;

- mondes 1, 3, 5, 7 et 9 : 2 quêtes de donjon et 1 légendaire ;

- mondes 2, 4, 6, 8 et 10 : 1 quête de donjon et 2 légendaires.

Chaque quête a : un identifiant, un titre, une catégorie, un résumé de deux phrases, un donneur, un niveau conseillé, des prérequis, des objectifs mesurables, et des récompenses en expérience, en or et parfois en objet. Deux quêtes ne doivent jamais différer seulement par le nom du monstre.

# Les prompts d'étape

Un prompt par session, dans l'ordre.

## Étape 0 — Cadrage (aucun code)

> ÉTAPE 0. Ne code rien pour le moment.
>
> 1\. Propose l'arborescence des fichiers du projet.
>
> 2\. Propose le format des fichiers de données : classes, compétences, monstres, objets, quêtes, mondes, donjons. Donne un exemple rempli pour chacun.
>
> 3\. Propose le format de la sauvegarde.
>
> 4\. Liste les risques techniques et ce que tu ne pourras pas faire.
>
> Attends ma validation avant de passer à l'étape 1.

## Étape 1 — Prototype jouable

> ÉTAPE 1. Construis un prototype jouable :
>
> \- écran titre avec « Nouvelle partie » et « Continuer » ;
>
> \- création du personnage : nom et choix parmi les 15 classes (fiche avec rôle, forces, faiblesses) ;
>
> \- une zone de test en 3D : héros à la troisième personne, caméra à la souris, marche, course, saut, roulade, collisions avec le décor ;
>
> \- 2 types de monstres qui patrouillent, te repèrent et te poursuivent ;
>
> \- combat en temps réel : attaque de base, 1 compétence par classe, esquive, verrouillage de la cible, temps de recharge, barres de vie ;
>
> \- HUD : vie, mana, niveau, expérience, or ;
>
> \- sauvegarde automatique et chargement.
>
> Test de fin : je crée un personnage, je tue un monstre, je recharge la page et je retrouve ma progression.

## Étape 2 — Monde 1 complet

> ÉTAPE 2. Construis le monde 1, Les Plaines de l'Aube :
>
> \- la région en 3D et son village unique, Valdor, avec tous les services (liste dans le contexte) et ses PNJ ;
>
> \- la carte en brouillard, la mini-carte, et la tour d'observation du monde 1 avec son escalade, sa vue panoramique et le voyage rapide ;
>
> \- 5 familles de monstres ;
>
> \- les 10 quêtes du monde 1, avec suivi des objectifs et journal de quêtes ;
>
> \- 2 donjons, dont un qui se termine par le Chef gobelin (2 phases, attaques annoncées) ;
>
> \- dialogues des PNJ, achat et vente chez le marchand.
>
> Test de fin : la carte est dans le brouillard au départ ; après avoir escaladé et activé la tour, toute la région apparaît. Je peux faire les 10 quêtes dans l'ordre et battre le boss ; chaque récompense n'est donnée qu'une fois.

## Étape 3 — Progression et butin

> ÉTAPE 3. Ajoute les systèmes de progression, en appliquant les formules du contexte :
>
> \- courbe d'expérience jusqu'au niveau 100 et gains par niveau ;
>
> \- pour chacune des 15 classes : 3 compétences actives, 1 passive, 1 ultime, débloquées par niveau ;
>
> \- inventaire (tri, comparaison, piles), 11 emplacements d'équipement, 6 raretés ;
>
> \- tables de butin, coffres uniques, forgeron (amélioration), effets (poison, brûlure, gel, saignement, ralentissement, étourdissement, malédiction).
>
> Test de fin : un outil de triche réservé au test me permet de passer au niveau 50 pour vérifier les compétences et l'équipement.

## Étapes 4, 5 et 6 — Les neuf autres mondes

> ÉTAPE 4 (puis 5, puis 6). Ajoute les mondes \[2 à 4\] (puis \[5 à 7\], puis \[8 à 10\]) :
>
> \- carte du monde interactive, portails, conditions de déblocage ;
>
> \- pour chaque monde : la région en 3D, son village unique, sa tour d'observation, 5 familles de monstres, 10 quêtes, 2 donjons, 1 boss ;
>
> \- tout le contenu est ajouté dans les fichiers de données, sans dupliquer le code.
>
> Ne modifie pas les mondes déjà faits, sauf pour corriger un bug que tu me signales.
>
> Test de fin : je peux voyager dans chaque nouveau monde, sa carte est en brouillard jusqu'à ce que j'active sa tour, et le script de vérification affiche les bons totaux.

## Étape 7 — Vérification et équilibrage

> ÉTAPE 7. Vérifie et équilibre le jeu complet :
>
> \- lance le script de vérification et corrige tout écart (15 classes, 10 mondes, 10 villages, 10 tours, 100 quêtes, 20 donjons, 50 familles de monstres) ;
>
> \- vérifie que chaque quête peut être terminée et que chaque prérequis existe ;
>
> \- simule la progression du niveau 1 au niveau 100 et donne le temps de jeu estimé par monde ;
>
> \- donne la liste des fonctionnalités terminées, incomplètes et absentes.

## Étape 8 — Options (une par session)

> ÉTAPE 8. Ajoute UNE seule de ces options, que je choisis : arbre de talents ; planeur pour descendre des hauteurs ; 7 métiers et artisanat ; faim, soif, froid et chaleur ; cycle jour/nuit et météo ; apparence détaillée du personnage ; sons et musiques générés par code ; commandes tactiles.

## Étape 9 — Comptes et sauvegarde en ligne

> ÉTAPE 9. Ajoute de vrais comptes (pseudo, e-mail, mot de passe) et la sauvegarde en ligne avec un service d'authentification et de base de données existant. Aucun mot de passe en clair, aucune clé secrète dans le code du navigateur. Donne-moi la liste exacte de ce que je dois créer et configurer moi-même. Le mode local reste disponible.

# Ce que l'IA ne fera pas, même avec ce prompt

- **Un vrai MMORPG en ligne.** Des centaines de joueurs dans le même monde demandent un serveur de jeu hébergé, payé et surveillé en permanence. L'étape 9 donne des comptes et une sauvegarde en ligne, pas un monde partagé.

- **Des graphismes de jeu commercial.** Le jeu sera en 3D low poly : personnages en formes simples et animations basiques, loin du rendu d'un jeu Nintendo. De beaux modèles 3D demandent un artiste ou des packs à acheter.

- **Un immense monde d'un seul tenant.** Pour rester fluide dans un navigateur, le jeu est découpé en dix zones reliées par des portails, au lieu d'une seule carte géante.

- **Un équilibrage parfait.** Les formules donnent une base cohérente, mais seul le test par de vrais joueurs permet de régler la difficulté.

- **100 quêtes mémorables d'un seul coup.** Elles seront correctes et variées si tu les fais écrire par lots de 10, monde par monde, et si tu les relis.
