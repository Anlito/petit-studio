# Petit Studio

Pad musical à boucles pour enfants (3–8 ans), pensé pour tablette.

- 4 rubriques de 8 sons : Percus, Notes, Animaux, Rigolo
- Boucle de 8 temps, jusqu'à 6 pistes, 3 vitesses (tortue, lapin, guépard)
- **Mes sons** : 5 enregistrements de 2 secondes au micro
- **Mes musiques** : 3 morceaux gardés sur la tablette
- Fonctionne hors ligne, sans compte, sans publicité, rien n'est envoyé sur internet

## Installer sur la tablette

1. Ouvrir l'adresse de l'appli dans le navigateur (Safari sur iPad, Chrome sur Android).
2. **iPad** : bouton Partager → « Sur l'écran d'accueil ».
   **Android** : menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil »).
3. Lancer Petit Studio depuis son icône : elle s'ouvre en plein écran.
4. Au premier enregistrement, autoriser le micro.

Sur iPad, si on n'entend rien : vérifier que le mode silencieux est désactivé.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Écran et styles |
| `app.js` | Sons, boucle, micro, sauvegarde (IndexedDB) |
| `sw.js` | Fonctionnement hors ligne |
| `manifest.webmanifest` + icônes | Installation sur l'écran d'accueil |

## Mettre à jour

Après une modification, changer `VERSION` dans `sw.js` (par ex. `petit-studio-v2`), sinon les tablettes gardent l'ancienne version en cache.
Les sons enregistrés et les musiques gardées ne sont pas touchés par une mise à jour.

## Ajouter une rubrique de sons

Dans `app.js`, ajouter une entrée dans `CATS` (8 sons) et, pour chaque son, une fonction du même nom dans `SYN`.
