# État du projet ASTRÉA

Dernière mise à jour : 12 novembre 2026, étape 0 (cadrage).

## Étape en cours

**Étape 0 — Cadrage : validée** (12/11/2026). Prochaine : **étape 1 — prototype jouable**, puis **étape 1b — page admin**.

## Fait

- Dépôt créé, cahier des charges v3 converti dans `docs/cahier-des-charges.md`.
- `CLAUDE.md` : contexte permanent relu à chaque session.
- Étape 0 : arborescence, formats des données (avec un exemple rempli pour chaque type), format de sauvegarde, risques et limites.

## Reste à faire

- Confirmer : au moins 25 lieux et 30 coffres par monde.
- Étape 1 : prototype jouable.
- Étape 1b : page admin (classes, compétences, monstres, objets, textes, réglages).
- Étapes 2 à 9 : voir `docs/cahier-des-charges.md`.

## Bugs connus

Aucun (pas encore de code).

## Décisions prises

- Nom du dépôt : `ASTR-A` (titre affiché dans le jeu : « ASTRÉA »).
- Données en JSON, textes par clés dans `data/textes/fr.json`.
- Three.js copié en local dans `vendor/`. Le jeu se lance via Live Server ou GitHub Pages.
- Un fichier de quêtes par monde.
- Carte : 100 km² au total, 10 mondes d'environ 3,2 km de côté, chargés par tronçons.
- Page admin complète, enrichie à chaque étape. Totaux = minimums, sauf 1 village et 1 tour par monde.
- Attaque = arme + 2 × stat ; défense des monstres = 2 + 1,5N ; critique = 5 % + 0,1 %/chance (max 50 %).
- 5ᵉ famille du monde 1 : frelons géants. Un seul emplacement de sauvegarde.

## Totaux actuels (vérification)

| Élément | Actuel | Exigé (minimum) |
|---|---|---|
| Classes | 0 | 15 |
| Mondes | 0 | 10 |
| Villages | 0 | 10 (exactement) |
| Tours | 0 | 10 (exactement) |
| Quêtes | 0 | 100 |
| Donjons | 0 | 20 |
| Familles de monstres | 0 | 50 |
| Boss | 0 | 10 |
