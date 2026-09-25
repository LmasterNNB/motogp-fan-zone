# MotoGP Fan Zone — déploiement automatique

Cette version sépare le site et le serveur :

- `index.html` + `config.js` : site public GitHub Pages.
- `server/` : petite API Vercel qui récupère les classements MotoGP côté serveur.

## 1. Déployer le serveur

1. Créer un compte sur Vercel.
2. Créer un nouveau projet et importer le dépôt GitHub.
3. Si le dépôt contient aussi le site, mettre **Root Directory** sur `server`.
4. Déployer.
5. Copier l'URL Vercel obtenue, puis ajouter `/api/standings`.

Exemple :
`https://mon-projet.vercel.app/api/standings`

## 2. Connecter GitHub Pages

Dans `config.js`, remplacer :
`https://TON-URL-VERCEL.vercel.app/api/standings`
par l'URL réelle du serveur.

Commit/push de `config.js` dans le dépôt GitHub Pages.

## 3. Fonctionnement

Le navigateur vérifie le serveur toutes les 60 secondes.
Le serveur récupère le classement MotoGP officiel et renvoie les points des cinq pilotes suivis.
Si le total augmente, le site affiche automatiquement `+X`, puis le nouveau total et réordonne le classement.

## Important

Le serveur utilise l'API utilisée par le site MotoGP. Cette API n'est pas présentée ici comme une API développeur publique garantie par MotoGP/Dorna ; son format peut changer. Le serveur est donc volontairement isolé dans `server/api/standings.js` pour pouvoir être adapté facilement.
