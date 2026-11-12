# Étape 0 — Cadrage

Ce document propose l'organisation du projet avant d'écrire le code. Rien n'est codé à cette étape.
Les points marqués **[à valider]** sont des décisions que le cahier des charges ne fixe pas : dis-moi si tu es d'accord ou ce que tu veux changer.

---

## 1. Arborescence des fichiers

```
astr-a/
├── index.html                 Page unique du jeu (charge src/main.js)
├── style.css                  Styles de l'interface (menus, HUD, carte)
├── CLAUDE.md                  Contexte permanent (relu à chaque session)
├── ETAT.md                    Suivi : fait, reste à faire, bugs, décisions
├── README.md                  Présentation et lancement
│
├── vendor/
│   └── three.module.min.js    Three.js en copie locale (licence MIT)
│
├── src/
│   ├── main.js                Point d'entrée : démarre le jeu
│   ├── core/                  Le « moteur » du jeu, sans contenu
│   │   ├── jeu.js             Boucle principale, changement d'écran/de monde
│   │   ├── evenements.js      Bus d'événements (monstre tué, objet ramassé…)
│   │   ├── donnees.js         Charge et indexe tous les fichiers de data/
│   │   ├── textes.js          t("cle") → texte français
│   │   ├── hasard.js          Générateur aléatoire avec graine
│   │   └── sauvegarde.js      Sauvegarde auto, export/import, migrations
│   ├── moteur3d/              Tout ce qui touche à Three.js
│   │   ├── rendu.js           Scène, lumières, ombres, brouillard visuel
│   │   ├── camera.js          Caméra orbitale 3e personne, verrouillage
│   │   ├── entrees.js         Clavier, souris, verrouillage du pointeur
│   │   ├── collisions.js      Capsule du héros contre terrain et obstacles
│   │   ├── terrain.js         Relief généré par graine, découpé en tronçons
│   │   ├── formes.js          Modèles low poly faits en code (héros, loup…)
│   │   └── animations.js      Animations procédurales (marche, attaque…)
│   ├── monde/                 Construit un monde à partir de data/mondes/
│   │   ├── constructeurMonde.js
│   │   ├── village.js
│   │   ├── tour.js            Tour d'observation, escalade, activation
│   │   ├── donjon.js
│   │   └── portail.js
│   ├── systemes/              Règles du jeu
│   │   ├── stats.js           Statistiques, niveaux, formules
│   │   ├── deplacement.js     Marche, course, endurance, saut, roulade, escalade
│   │   ├── combat.js          Dégâts, critiques, blocage, esquive
│   │   ├── competences.js     Compétences, recharges, effets
│   │   ├── effets.js          Poison, brûlure, gel, etc.
│   │   ├── ia.js              Patrouille, détection, poursuite, attaques annoncées
│   │   ├── inventaire.js      Objets, piles, équipement, banque
│   │   ├── butin.js           Tables de butin, raretés
│   │   ├── quetes.js          Suivi des objectifs, récompenses uniques
│   │   ├── dialogues.js       Arbres de dialogue des PNJ
│   │   ├── commerce.js        Achat, vente, forgeron
│   │   └── carte.js           Brouillard, zones révélées, voyage rapide
│   └── ui/                    Interface en HTML par-dessus la 3D
│       ├── ecranTitre.js
│       ├── creationPersonnage.js
│       ├── hud.js             Vie, mana, endurance, niveau, XP, or
│       ├── miniCarte.js
│       ├── grandeCarte.js
│       ├── journalQuetes.js
│       ├── inventaireUI.js
│       ├── dialogueUI.js
│       └── boutiqueUI.js
│
├── data/                      TOUT le contenu du jeu (aucun code)
│   ├── textes/fr.json         Tous les textes affichés
│   ├── schemas/               Description de chaque type de donnée
│   │                          (utilisée par la page admin ET la vérification)
│   ├── config.json            Formules et réglages globaux
│   ├── classes.json
│   ├── competences.json
│   ├── monstres.json
│   ├── objets.json
│   ├── butin.json             Tables de butin
│   ├── pnj.json
│   ├── dialogues.json
│   ├── donjons.json
│   ├── mondes/monde-01.json … monde-10.json
│   └── quetes/monde-01.json … monde-10.json
│
├── admin/                     Page admin : modifier tout le contenu sans coder
│   ├── index.html
│   ├── admin.js               Formulaires générés à partir des schémas
│   ├── apercu3d.js            Aperçu 3D d'un monstre, d'une classe, d'un objet
│   └── editeurMonde.js        Vue de dessus pour placer village, tour, zones…
│
├── outils/
│   ├── verification.html      Ouvre-la dans le navigateur : compte le contenu
│   ├── verifier.mjs           Même vérification en ligne de commande (Node)
│   └── triche.js              Outil de test (activé seulement avec ?debug=1)
│
└── docs/
    ├── cahier-des-charges.md  Ton document, version 3
    └── etape-0-cadrage.md     Ce document
```

**Pourquoi ce découpage :** `core/`, `moteur3d/` et `systemes/` ne contiennent aucun contenu (pas de nom de monstre, pas de quête). Le contenu est uniquement dans `data/`. C'est ce qui permet d'ajouter les mondes 2 à 10 en écrivant seulement des fichiers JSON.

**Un fichier de quêtes par monde** plutôt qu'un seul fichier de 100 quêtes : plus facile à relire, et on écrit les quêtes par lots de 10 comme le recommande ton document.

---

## 2. Formats des fichiers de données

Règles communes à tous les fichiers :

- Format **JSON**.
- Chaque élément a un `id` unique, en minuscules sans accent (`loup_gris`, `m01-p01`).
- Aucun texte affiché dans les données : on met une **clé** (`"texte": "monstre.loup_gris"`), et le texte est dans `data/textes/fr.json`. C'est ce qui permettra de traduire plus tard.
- Les positions sont en mètres `[x, z]` sur le plan du monde (la hauteur `y` est calculée à partir du terrain).
- Les valeurs de vie, attaque et XP des monstres **ne sont pas écrites à la main** : elles sont calculées par les formules. Les données ne peuvent que les ajuster légèrement (multiplicateurs entre 0,7 et 1,3, vérifiés par le script).

### 2.1 Textes — `data/textes/fr.json`

```json
{
  "classe.chevalier.nom": "Chevalier",
  "classe.chevalier.role": "Tank, épée et bouclier, parade",
  "classe.chevalier.forces": "Très résistant, protège bien, pardonne les erreurs.",
  "classe.chevalier.faiblesses": "Lent, peu de dégâts, peu de solutions à distance.",
  "competence.chev_charge.nom": "Charge du bouclier",
  "competence.chev_charge.description": "Fonce vers l'avant et peut étourdir le premier ennemi touché.",
  "monstre.loup_gris.nom": "Loup gris",
  "quete.m01-p01.titre": "La marque de la relique",
  "quete.m01-p01.resume": "Tu te réveilles près de Valdor avec une étrange marque sur la main. L'Ancien du village semble savoir ce qu'elle signifie."
}
```

### 2.2 Réglages et formules — `data/config.json`

Les formules du cahier des charges, à un seul endroit. Si on veut rééquilibrer, on change un nombre ici.

```json
{
  "niveauMax": 100,
  "xpNiveau": { "base": 100, "exposant": 1.5 },
  "parNiveau": { "vieMana": 0.05, "statPrincipale": 2, "autresStats": 1 },
  "degats": { "diviseurDefense": 2, "variation": 0.10, "multiplicateurCritique": 1.5, "critiqueBase": 0.05, "critiqueParChance": 0.001, "critiqueMax": 0.5 },
  "monstre": { "vie": [40, 22], "attaque": [6, 2.4], "xp": [12, 5], "defense": [2, 1.5] },
  "boss": { "vie": 12, "xp": 20 },
  "raretes": [
    { "id": "commun",     "chance": 0.60,  "multiplicateur": 1.00, "couleur": "#c8c8c8" },
    { "id": "inhabituel", "chance": 0.25,  "multiplicateur": 1.15, "couleur": "#5bd16a" },
    { "id": "rare",       "chance": 0.10,  "multiplicateur": 1.30, "couleur": "#4a8cff" },
    { "id": "epique",     "chance": 0.04,  "multiplicateur": 1.50, "couleur": "#b05bff" },
    { "id": "legendaire", "chance": 0.009, "multiplicateur": 1.75, "couleur": "#ff9a1f" },
    { "id": "mythique",   "chance": 0.001, "multiplicateur": 2.00, "couleur": "#ff3d5a" }
  ],
  "mort": { "perteOr": 0.05, "mondeSansPenalite": [1] },
  "deplacement": { "marche": 4.5, "course": 8, "enduranceMax": 100, "coutCourseParSeconde": 12, "coutRoulade": 20, "coutEscaladeParSeconde": 10, "recuperationParSeconde": 25 },
  "tailleMonde": 3200,
  "tailleTroncon": 200,
  "distanceVue": 900,
  "brouillard": { "grille": 256, "rayonRevele": 60 }
}
```

**[à valider] Décisions ajoutées ici, que ton document ne précise pas :**

- **« Attaque »** dans la formule des dégâts = attaque de l'arme + 2 × la statistique utilisée par la compétence (force pour le physique, intelligence pour la magie, agilité pour la distance).
- **Défense des monstres** = 2 + 1,5 × N (ton document donne leur vie et leur attaque, mais pas leur défense).
- **Chance de critique** = 5 % + 0,1 % par point de chance, plafonnée à 50 %.
- **Multiplicateurs de rareté** des statistiques d'objets : de ×1 (commun) à ×2 (mythique).
- **Taille d'un monde (validé)** : environ 3,2 km × 3,2 km, soit 10 km² par monde et **100 km² au total**. On traverse un monde en environ 12 minutes en marchant et 7 minutes en courant. Cela remplace la règle « 3 à 5 minutes » du cahier des charges. Le monde est chargé par tronçons de 200 m autour du joueur, et le relief lointain est affiché en version simplifiée.

### 2.3 Classes — `data/classes.json`

```json
{
  "id": "chevalier",
  "texte": "classe.chevalier",
  "statPrincipale": "defense",
  "armePredilection": "epee_bouclier",
  "statsBase": { "force": 9, "intelligence": 3, "agilite": 5, "endurance": 10, "defense": 8, "chance": 4, "vie": 150, "mana": 40 },
  "competences": {
    "actives": ["chev_charge", "chev_frappe_bouclier", "chev_cri_defi"],
    "passive": "chev_rempart",
    "ultime": "chev_bastion"
  },
  "equipementDepart": ["epee_rouillee", "bouclier_bois", "tunique_cuir"],
  "couleurs": { "principale": "#8a9bb0", "secondaire": "#c9a227" }
}
```

**[à valider] Statistique principale de chaque classe** (elle reçoit +2 par niveau) :

| Classe | Stat principale | Arme de prédilection |
|---|---|---|
| Chevalier | Défense | Épée et bouclier |
| Sorcier | Intelligence | Bâton |
| Mage noir | Intelligence | Grimoire |
| Archer | Agilité | Arc long |
| Assassin | Chance | Dagues |
| Paladin | Endurance | Masse et bouclier |
| Berserker | Force | Hache à deux mains |
| Druide | Intelligence | Bâton de bois vivant |
| Nécromancien | Intelligence | Faux |
| Prêtre | Intelligence | Sceptre |
| Samouraï | Agilité | Katana |
| Invocateur | Intelligence | Orbe |
| Chasseur | Agilité | Arc court |
| Élémentaliste | Intelligence | Gantelets runiques |
| Paladin noir | Force | Épée à deux mains |

Sept classes magiques utilisent l'intelligence. Elles se distinguent par leurs compétences, pas par leur stat.

### 2.4 Compétences — `data/competences.json`

```json
{
  "id": "chev_charge",
  "texte": "competence.chev_charge",
  "classe": "chevalier",
  "type": "active",
  "niveauRequis": 1,
  "coutMana": 15,
  "recharge": 6,
  "statUtilisee": "force",
  "coefficient": 1.4,
  "forme": { "type": "ruee", "distance": 8, "largeur": 1.5 },
  "effets": [ { "id": "etourdissement", "chance": 0.5, "duree": 1.5 } ],
  "visuel": { "couleur": "#c9a227", "particules": "etincelles" }
}
```

- `type` : `active`, `passive` ou `ultime`.
- `forme.type` : `melee`, `projectile`, `zone`, `ruee`, `soin`, `bouclier`, `invocation`, `transformation`, `posture`. Chaque type est codé une seule fois et réutilisé par toutes les classes.
- Une passive n'a pas de forme mais des `bonus` (exemple : `{ "defense": 0.10, "blocageReduit": 0.2 }`).

### 2.5 Monstres — `data/monstres.json`

```json
{
  "id": "loup_gris",
  "texte": "monstre.loup_gris",
  "famille": "loups",
  "monde": 1,
  "niveaux": [1, 4],
  "multiplicateurs": { "vie": 0.85, "attaque": 1.0 },
  "comportement": { "type": "meute", "vision": 18, "abandon": 35, "vitesse": 6.5, "patrouille": "cercle" },
  "attaques": [
    { "id": "morsure", "coefficient": 1.0, "portee": 2, "recharge": 1.6, "annonce": 0.4 },
    { "id": "bond", "coefficient": 1.3, "portee": 6, "recharge": 5, "annonce": 0.7 }
  ],
  "modele": { "forme": "quadrupede", "taille": 1.0, "couleurs": ["#7a7a80", "#4a4a50"] },
  "butin": "butin_loup"
}
```

Exemple de **boss**, avec phases et attaques annoncées (`annonce` = délai en secondes pendant lequel l'attaque est signalée au sol avant de frapper) :

```json
{
  "id": "chef_gobelin",
  "texte": "monstre.chef_gobelin",
  "famille": "gobelins",
  "monde": 1,
  "boss": true,
  "niveaux": [10, 10],
  "comportement": { "type": "boss", "arene": 20 },
  "phases": [
    { "seuilVie": 1.0, "attaques": [
      { "id": "coup_massue", "coefficient": 1.2, "portee": 3, "recharge": 2.5, "annonce": 0.8 },
      { "id": "charge", "coefficient": 1.5, "portee": 12, "recharge": 8, "annonce": 1.2 }
    ]},
    { "seuilVie": 0.5, "message": "boss.chef_gobelin.phase2", "invocation": { "monstre": "gobelin_eclaireur", "nombre": 3 }, "attaques": [
      { "id": "tourbillon", "coefficient": 1.3, "portee": 5, "recharge": 6, "annonce": 1.0 },
      { "id": "coup_massue", "coefficient": 1.4, "portee": 3, "recharge": 2, "annonce": 0.6 }
    ]}
  ],
  "modele": { "forme": "humanoide_trapu", "taille": 1.8, "couleurs": ["#5d7a2f", "#8b5a2b"] },
  "butin": "butin_chef_gobelin"
}
```

La **famille** sert au comptage des 50 familles exigées (5 par monde). Une famille peut avoir plusieurs variantes (loup gris, loup alpha).

**[à valider] Cinquième famille du monde 1.** Ton document en cite 4 (loups, sangliers, gobelins, bandits). Je propose les **frelons géants**, un ennemi volant qui oblige à viser en hauteur. On peut aussi prendre les **slimes des rivières**.

### 2.6 Objets — `data/objets.json`

```json
[
  {
    "id": "epee_rouillee",
    "texte": "objet.epee_rouillee",
    "type": "arme",
    "emplacement": "armePrincipale",
    "categorie": "epee",
    "niveauRequis": 1,
    "stats": { "attaque": 8 },
    "statsAleatoires": 0,
    "prix": 20,
    "pileMax": 1,
    "modele": { "forme": "epee", "couleurs": ["#8a6f5a", "#5a3d2b"] }
  },
  {
    "id": "potion_vie_petite",
    "texte": "objet.potion_vie_petite",
    "type": "consommable",
    "effet": { "soin": 60 },
    "recharge": 3,
    "prix": 15,
    "pileMax": 20,
    "modele": { "forme": "fiole", "couleurs": ["#d33"] }
  },
  {
    "id": "peau_loup",
    "texte": "objet.peau_loup",
    "type": "materiau",
    "prix": 4,
    "pileMax": 99
  }
]
```

- `type` : `arme`, `armure`, `bijou`, `consommable`, `materiau`, `quete` (un objet de quête ne se vend pas et ne se jette pas).
- `emplacement` : `tete`, `torse`, `jambes`, `bottes`, `gants`, `armePrincipale`, `armeSecondaire`, `collier`, `anneau` (l'anneau peut aller dans `anneau1` ou `anneau2`, ce qui donne les 11 emplacements).
- La **rareté n'est pas dans le fichier** : elle est tirée au moment où l'objet est obtenu, avec les chances de `config.json`. `statsAleatoires` donne le nombre de bonus aléatoires ajoutés selon la rareté.

### 2.7 Tables de butin — `data/butin.json`

```json
{
  "id": "butin_loup",
  "or": [2, 6],
  "tirages": 1,
  "entrees": [
    { "objet": "peau_loup", "poids": 55 },
    { "objet": "potion_vie_petite", "poids": 10 },
    { "categorie": "equipement", "niveau": "monstre", "poids": 8 },
    { "rien": true, "poids": 27 }
  ]
}
```

### 2.8 PNJ — `data/pnj.json`

```json
{
  "id": "pnj_ancien_valdor",
  "texte": "pnj.ancien_valdor",
  "monde": 1,
  "lieu": "valdor",
  "role": "histoire",
  "service": null,
  "position": [12, -6],
  "dialogue": "dlg_ancien_valdor",
  "apparence": { "forme": "humanoide_age", "couleurs": ["#6b4f3a", "#e8e0d0"], "accessoire": "baton" },
  "routine": "immobile"
}
```

`service` vaut l'un des 9 services d'un village (`auberge`, `marchand`, `armurier`, `forgeron`, `alchimiste`, `banque`, `maitreCompetences`, `tableauQuetes`, `portail`) ou `null`. Le script de vérification contrôle que chaque village possède les 9 services.

### 2.9 Dialogues — `data/dialogues.json`

```json
{
  "id": "dlg_ancien_valdor",
  "debut": "accueil",
  "noeuds": {
    "accueil": {
      "texte": "dlg.ancien.accueil",
      "choix": [
        { "texte": "dlg.ancien.marque", "condition": { "queteDisponible": "m01-p01" }, "action": { "proposerQuete": "m01-p01" } },
        { "texte": "dlg.ancien.rendre", "condition": { "queteTerminable": "m01-p01" }, "action": { "terminerQuete": "m01-p01" } },
        { "texte": "dlg.ancien.histoire", "suite": "histoire" },
        { "texte": "commun.au_revoir", "fin": true }
      ]
    },
    "histoire": {
      "texte": "dlg.ancien.pacte",
      "choix": [ { "texte": "commun.retour", "suite": "accueil" } ]
    }
  }
}
```

Les conditions possibles sont `queteDisponible`, `queteActive`, `queteTerminable`, `queteTerminee`, `niveauMin`, `objetPossede` et `tourActivee`. Une option dont la condition est fausse n'apparaît pas : pas de bouton qui ne fait rien.

### 2.10 Quêtes — `data/quetes/monde-01.json`

```json
{
  "id": "m01-p01",
  "texte": "quete.m01-p01",
  "categorie": "principale",
  "monde": 1,
  "donneur": "pnj_ancien_valdor",
  "rendu": "pnj_ancien_valdor",
  "niveauConseille": 1,
  "prerequis": { "quetes": [], "niveau": 1 },
  "objectifs": [
    { "type": "parler", "cible": "pnj_forgeron_valdor" },
    { "type": "tuer", "cible": "loup_gris", "quantite": 4 },
    { "type": "activer_tour", "cible": "tour_m01" }
  ],
  "recompenses": { "xp": 180, "or": 40, "objets": [ { "id": "bouclier_bois", "quantite": 1 } ] }
}
```

- `categorie` : `principale`, `secondaire`, `chasse`, `donjon`, `legendaire`.
- Types d'objectifs : `tuer` (un monstre ou une famille), `collecter`, `livrer`, `parler`, `explorer` (atteindre un lieu), `activer_tour`, `terminer_donjon`, `vaincre_boss`, `ouvrir_coffre`, `escorter`. Tous sont **mesurables** : un compteur ou un oui/non.
- Le script vérifie que chaque donneur, cible, prérequis et objet existe, et que la répartition par monde est respectée (2 principales, 3 secondaires, 2 chasse, puis donjon et légendaires selon le monde pair ou impair).
- Pour que deux quêtes ne diffèrent jamais seulement par le nom du monstre, chaque lot de 10 quêtes mélange au moins 5 types d'objectifs différents.

### 2.11 Donjons — `data/donjons.json`

```json
{
  "id": "d-m01-b",
  "texte": "donjon.d-m01-b",
  "monde": 1,
  "niveau": 9,
  "entree": [-840, 1040],
  "style": "caverne",
  "graine": 1102,
  "salles": [
    { "type": "combat", "vagues": [ [["gobelin_eclaireur", 3]], [["gobelin_eclaireur", 2], ["gobelin_chaman", 1]] ] },
    { "type": "enigme", "enigme": "leviers_ordre", "parametres": { "nombre": 3 } },
    { "type": "combat", "vagues": [ [["bandit_brute", 2]] ] },
    { "type": "boss", "boss": "chef_gobelin" }
  ],
  "coffreFinal": "butin_d-m01-b",
  "recompenseUnique": true
}
```

Un donjon est une suite de salles reliées par des couloirs. Elles sont construites par le code à partir du `style` (caverne, crypte, temple, pyramide…). Les énigmes (`leviers_ordre`, `plaques_pression`, `miroirs_lumiere`…) sont des petits modules réutilisables.

### 2.12 Mondes — `data/mondes/monde-01.json`

```json
{
  "id": 1,
  "texte": "monde.m01",
  "niveaux": [1, 10],
  "terrain": {
    "graine": 1001,
    "relief": "collines",
    "hauteurMax": 35,
    "eau": { "rivieres": 2, "niveau": 2 },
    "vegetation": { "arbres": 0.35, "herbe": 0.8, "rochers": 0.2 },
    "palette": { "sol": "#7fb34a", "roche": "#8d8576", "eau": "#3f88c5", "ciel": "#9fd4ff" }
  },
  "depart": [0, 40],
  "village": {
    "id": "valdor",
    "texte": "village.valdor",
    "position": [0, 0],
    "rayon": 45,
    "batiments": [
      { "service": "auberge", "position": [10, 8] },
      { "service": "marchand", "position": [-12, 6] }
    ]
  },
  "tour": {
    "id": "tour_m01",
    "position": [920, -640],
    "hauteur": 45,
    "acces": "escalade",
    "gardiens": [],
    "enigme": null
  },
  "zones": [
    { "id": "prairie_est", "centre": [800, 200], "rayon": 450, "monstres": [ ["loup_gris", 24], ["sanglier", 16] ] },
    { "id": "camp_bandits", "type": "camp", "centre": [-720, -480], "rayon": 60, "monstres": [ ["bandit_brute", 5] ] }
  ],
  "lieux": [
    { "id": "ruines_aube", "type": "ruines", "position": [-240, 960] },
    { "id": "pont_vieux", "type": "point_interet", "position": [360, -160] }
  ],
  "coffres": [
    { "id": "coffre_m01_01", "position": [-300, 1000], "butin": "butin_coffre_m01", "visibleDeLoin": true }
  ],
  "donjons": ["d-m01-a", "d-m01-b"],
  "boss": "chef_gobelin",
  "portails": [
    { "vers": 2, "position": [1520, 0], "condition": { "queteTerminee": "m01-p02" } }
  ]
}
```

- Le relief est **généré à partir de la graine** : même graine, même monde, à chaque partie. Le fichier reste petit.
- **Pour que 10 km² ne soient pas vides** : chaque monde aura au moins 25 lieux à découvrir (camps, ruines, points de vue, grottes, sanctuaires d'énigme) et au moins 30 coffres. Le script de vérification les compte. **[à valider]**
- Les camps, ruines et avant-postes sont dans `zones` et `lieux` : ils n'ont pas de PNJ ni de service. Le script vérifie qu'il y a exactement 1 village par monde.
- `tour.acces` : `escalade` (monde 1, sans danger), `gardee`, `obstacles` ou `enigme` pour les mondes suivants.

---

## 3. Format de la sauvegarde

Stockée dans le navigateur (`localStorage`, clé `astrea.sauvegarde`), en JSON. Sauvegarde automatique toutes les 30 secondes, et aussi à chaque changement de monde, quête terminée, montée de niveau ou fermeture de la page.

```json
{
  "version": 1,
  "date": "2026-11-12T09:30:00Z",
  "tempsDeJeu": 5420,
  "personnage": {
    "nom": "Amine",
    "classe": "chevalier",
    "niveau": 7,
    "xp": 340,
    "or": 512,
    "vie": 260,
    "mana": 55
  },
  "position": { "monde": 1, "x": 120.5, "y": 8.2, "z": -40.1, "orientation": 1.57 },
  "inventaire": [
    { "uid": "o12", "id": "potion_vie_petite", "quantite": 6 },
    { "uid": "o15", "id": "epee_courte", "quantite": 1, "rarete": "rare", "bonus": { "force": 3, "chance": 2 }, "amelioration": 1 }
  ],
  "equipement": {
    "tete": null, "torse": "o3", "jambes": null, "bottes": null, "gants": null,
    "armePrincipale": "o15", "armeSecondaire": "o4", "collier": null, "anneau1": null, "anneau2": null
  },
  "banque": { "or": 0, "objets": [] },
  "competences": { "debloquees": ["chev_charge", "chev_frappe_bouclier"], "raccourcis": ["chev_charge", "chev_frappe_bouclier", null, null] },
  "quetes": {
    "actives": { "m01-s02": { "objectifs": [3, 0] } },
    "terminees": ["m01-p01", "m01-s01"]
  },
  "carte": {
    "1": {
      "brouillard": "<grille 256×256 en base64, 1 bit par case>",
      "toursActivees": ["tour_m01"],
      "lieuxVisites": ["valdor", "ruines_aube"]
    }
  },
  "coffresOuverts": ["coffre_m01_01"],
  "donjonsTermines": ["d-m01-a"],
  "bossVaincus": [],
  "options": { "sensibiliteSouris": 1.0, "inverserY": false, "volume": 0.8 }
}
```

- **Récompenses uniques** : une quête dans `terminees` ne peut plus être rendue, un coffre dans `coffresOuverts` reste vide. C'est ce qui garantit que chaque récompense n'est donnée qu'une fois.
- **Brouillard** : chaque monde est découpé en 256 × 256 cases d'environ 12,5 m. Une case révélée vaut 1, et le joueur révèle un cercle de 60 m autour de lui. La tour met toute la grille à 1. Ça prend environ 11 Ko par monde, donc environ 110 Ko pour les 10 mondes, ce qui tient largement dans le navigateur.
- **Export** : bouton « Exporter » qui télécharge `astrea-<nom>-<date>.json`. **Import** : on choisit le fichier, le jeu vérifie la `version` et la structure, puis refuse proprement un fichier invalide.
- **Version** : si le format change plus tard, une fonction de migration convertit l'ancienne sauvegarde au lieu de la casser.
- **[à valider]** Un seul emplacement de sauvegarde (une partie à la fois, plus l'export pour garder des copies). On peut passer à 3 emplacements si tu préfères.
- « Continuer » n'apparaît sur l'écran titre que s'il existe une sauvegarde valide.

---

## 4. Risques techniques et limites

### Ce qui est risqué (et comment on le gère)

| Risque | Ce qu'on fait |
|---|---|
| **Fluidité** : un monde de 3,2 km en 3D avec ombres, végétation et monstres peut ramer sur un PC moyen. C'est le plus gros risque technique du projet. | Seuls les tronçons de 200 m proches du joueur sont chargés en détail, le relief lointain est simplifié, avec un brouillard de distance. Terrain découpé en tronçons, arbres et herbe dessinés en une seule fois (*instancing*), seuls les monstres proches sont actifs, ombres limitées autour du héros, compteur d'images par seconde visible en mode test. Tu me donnes ton chiffre : je ne peux pas mesurer sur ton ordinateur. |
| **Collisions maison** : pas de moteur physique, donc risques de traverser le sol ou de rester coincé. | Collisions simples et robustes (capsule contre relief et boîtes), téléportation de secours si le héros tombe sous la carte, tests dédiés. |
| **Escalade** : grimper partout comme dans BotW est très complexe. | Escalade limitée aux tours et aux parois marquées, comme prévu dans ton document. |
| **Personnages sans modèles 3D** : ils seront faits de formes simples avec des animations calculées. | On assume un style low poly propre et coloré, mais ça restera simple. |
| **Équilibrage de 15 classes** : les formules donnent une base, pas un jeu parfaitement réglé. | Simulation chiffrée à l'étape 3 et à l'étape 7, puis réglage d'après tes parties. |
| **Monde vide** : 10 km² avec seulement 10 quêtes par monde, ça peut paraître désert. | Au moins 25 lieux et 30 coffres par monde, des tours visibles de loin. Le voyage rapide limite les longs trajets. Une monture pourra être ajoutée comme option à l'étape 8. |
| **Volume de contenu** : 100 quêtes, 75 compétences, 50 familles. | Contenu écrit par lots (un monde à la fois), relu par toi, contrôlé par le script. |
| **Sauvegarde du navigateur** : elle peut être effacée (navigation privée, nettoyage du cache). | Export de fichier, et un avertissement si le stockage n'est pas disponible. |
| **Lancement** : les modules JavaScript ne marchent pas en double-cliquant sur `index.html`. | Lancer avec Live Server (VS Code) ou jouer sur GitHub Pages. |

### Ce que je ne pourrai pas faire

- **Tester la sensation de jeu à ta place.** Je peux vérifier que le code se lance et que les données sont correctes, mais pas savoir si la caméra est agréable ou si le saut est trop mou. Tes retours après chaque test sont indispensables.
- **Un rendu de jeu commercial.** Le rendu sera low poly, sans modèles d'artiste.
- **De la musique de qualité.** Sans fichiers audio, on pourra seulement générer des sons simples par le code (option de l'étape 8).
- **Manette et écran tactile.** Ils ne sont pas prévus avant l'option « commandes tactiles » de l'étape 8.
- **Un vrai MMO.** L'étape 9 apportera des comptes et une sauvegarde en ligne, mais pas de monde partagé entre joueurs. Il faudra que tu crées toi-même le compte du service en ligne (je te donnerai la liste exacte).

---


## 5. Page admin

Demandée par Mohamed Amine : une page pour **tout modifier sans toucher au code** (ajouter une classe « Mage blanc », un monstre, un objet, une quête, un monde…).

### Ce qu'elle permet

- **Pour chaque type de donnée** (classes, compétences, monstres, objets, butin, PNJ, dialogues, quêtes, donjons, mondes, textes, réglages et formules) : lister, rechercher, créer, modifier, dupliquer et supprimer.
- **Les textes se modifient dans le même formulaire** : en créant « Mage blanc », tu remplis son nom, son rôle, ses forces et ses faiblesses, et ils vont automatiquement dans `fr.json`.
- **Des listes déroulantes plutôt que des identifiants à taper** : pour choisir le butin d'un monstre ou le donneur d'une quête, on choisit dans la liste de ce qui existe.
- **Une vérification avant d'enregistrer** : identifiant unique, champs obligatoires, valeurs dans les limites (par exemple un multiplicateur de monstre entre 0,7 et 1,3), références qui existent. La page refuse de supprimer un élément encore utilisé (un monstre cité dans une quête, par exemple) et dit où il est utilisé.
- **Un aperçu 3D** du modèle low poly d'un monstre, d'une classe ou d'un objet pendant qu'on règle ses formes et ses couleurs.
- **Un éditeur de monde vu du dessus** : la carte du relief, sur laquelle on place ou déplace le village, la tour, les zones de monstres, les lieux, les coffres, les entrées de donjon et les portails en cliquant.
- **Un bouton « Tester »** qui ouvre le jeu avec l'outil de triche, directement à l'endroit modifié.
- **Le tableau des totaux** (le même que le script de vérification), toujours visible.

### Comment elle enregistre

Le jeu est un site statique, sans serveur. La page admin écrit donc **directement dans les fichiers du dossier `data/` de ton ordinateur**, grâce à l'accès aux fichiers de Chrome et Edge (tu choisis le dossier du projet une fois, et le navigateur demande ton accord). Ensuite tu fais un commit, et le jeu en ligne est à jour.

Sur un navigateur qui ne permet pas cet accès (Firefox), la page télécharge le fichier JSON modifié, et tu le remplaces dans `data/`.

**Sécurité :** sur GitHub Pages, la page admin ne peut rien modifier, puisqu'elle n'a accès qu'à ton dossier local. Elle ne présente donc pas de danger. À l'étape 9 (comptes en ligne), elle sera réservée à un compte administrateur.

### Comment elle reste à jour

Les formulaires ne sont pas codés à la main : ils sont **générés à partir des schémas** de `data/schemas/`. Le script de vérification utilise les mêmes schémas, donc un nouveau champ ajouté dans un type de donnée apparaît automatiquement dans l'admin.

### Ce qu'elle ne peut pas faire (honnêtement)

L'admin **assemble des briques qui existent déjà dans le code**. Un « Mage blanc » qui soigne, protège et lance des projectiles de lumière est possible uniquement avec l'admin, car toutes ces formes de compétence existent déjà. Une mécanique vraiment nouvelle, comme une classe qui se transforme en dragon volant, demande d'abord d'ajouter cette brique dans le code. Après ça, l'admin peut la réutiliser autant que tu veux.

### Les totaux deviennent des minimums

Puisque tu pourras ajouter du contenu, les totaux du cahier des charges deviennent des **minimums** : au moins 15 classes, 100 quêtes, 20 donjons, 50 familles de monstres. Deux règles restent strictes : **un seul village par monde**, et **une seule tour par monde**. L'admin empêche d'en ajouter un deuxième.

### Quand on la construit

- **Étape 1b** (juste après le prototype) : la base de la page admin, avec les classes, les compétences, les monstres, les objets, les textes et les réglages, plus l'enregistrement dans les fichiers.
- **Ensuite, à chaque étape**, les nouveaux types de données arrivent dans l'admin dans la même session : PNJ, dialogues, quêtes et l'éditeur de monde à l'étape 2, butin à l'étape 3, etc.

---

## 6. Décisions validées

Validé par Mohamed Amine le 12 novembre 2026 :

- Arborescence, formats des données et format de sauvegarde : **ok**.
- Attaque = arme + 2 × stat ; défense des monstres = 2 + 1,5 × N ; critique = 5 % + 0,1 % par point de chance (max 50 %) : **ok**.
- Statistique principale de chaque classe (tableau du 2.3) : **ok**.
- 5ᵉ famille du monde 1 : **frelons géants** (proposition par défaut).
- Un seul emplacement de sauvegarde, plus l'export : **ok**.
- **Taille de la carte : 100 km² au total**, soit 10 mondes d'environ 3,2 km × 3,2 km.
- **Page admin complète** (section 5), construite à l'étape 1b puis enrichie à chaque étape.
- Les totaux du cahier des charges sont des **minimums**, sauf 1 village et 1 tour par monde (strict).
- **[à valider]** Au moins 25 lieux et 30 coffres par monde, pour remplir les 10 km².
