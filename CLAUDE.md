# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn test          # tests en mode watch (Vitest)
yarn test:ci       # tests one-shot avec coverage (utilisé par le pre-commit hook et CI)
yarn typecheck     # vérification de types TypeScript (tsc --noEmit)
yarn build         # compile CJS + ES + UMD + déclarations .d.ts vers dist/ via Vite
yarn lint          # ESLint (typescript-eslint) sur tout le dépôt (src/, demo/, fichiers de config)
yarn prettier      # formate tous les .js / .ts (hors .prettierignore)
```

Lancer un test unique :
```bash
yarn test:ci --reporter=verbose getPermission
```

Le pre-commit hook exécute automatiquement `typecheck` + `test:ci` + `lint` + `prettier` via Husky 9 (`.husky/pre-commit`).

## Architecture

Bibliothèque utilitaire légère (~5 fonctions) écrite en **TypeScript**, qui encapsule les APIs navigateur `navigator.permissions` et `navigator.mediaDevices`. Les types des APIs navigateur (`PermissionName`, `PermissionState`, `MediaStreamConstraints`, `AbortSignal`) proviennent de la lib `DOM` de TypeScript.

**Flux d'appel :**
```
getUserMediaStream
  └── isNavigatorPermissionsSupported  (guard)
  └── isNavigatorMediaDevicesSupported (guard)
  └── navigator.permissions.query()         (rejette si 'denied')
  └── navigator.mediaDevices.getUserMedia() (Promise.race avec le signal, uniquement si fourni)

getPermission
  └── isNavigatorPermissionsSupported  (guard)
  └── navigator.permissions.query()
  └── (sur 'prompt') attend l'événement 'change', borné par signal/timeout

checkPermission
  └── isNavigatorPermissionsSupported  (guard)
  └── navigator.permissions.query()
```

- `isNavigatorPermissionsSupported` / `isNavigatorMediaDevicesSupported` : guards booléens sur l'existence des APIs navigateur.
- `getPermission(permissionName, { signal?, timeout? })` : watcher **passif** qui résout sur `'granted'` une fois la permission accordée. `navigator.permissions.query()` n'affiche **jamais** de dialogue : `'granted'` résout immédiatement, `'denied'` rejette (`NOT_ALLOWED_ERR`). Sur `'prompt'`, attend l'événement `change` (déclenché seulement quand autre chose provoque la vraie requête, ex. `getUserMediaStream`) ; comme rien ne fait transitionner l'état tout seul, l'attente doit être **bornée** par `timeout` (rejette `TimeoutError`) et/ou `signal`. Sans aucune des deux sur `'prompt'`, rejette immédiatement (`InvalidStateError`) au lieu de rester pendante à jamais. Le listener `change` est nettoyé sur tous les chemins de résolution.
- `checkPermission(permissionName)` : retourne une Promise résolue immédiatement avec l'état courant de la permission (`'granted'` / `'denied'` / `'prompt'`), sans attendre d'interaction utilisateur ni rejeter sur `'denied'`. Passe par le même guard `isNavigatorPermissionsSupported` que `getPermission`. Utile pour lire l'état en amont (bannière, bouton désactivé, branchement UI).
- `getUserMediaStream(permissionName, mediaStreamConstraints, { signal? })` : appelle directement `navigator.permissions.query()` (rejette si `'denied'`) puis `navigator.mediaDevices.getUserMedia()` — c'est `getUserMedia` qui déclenche le vrai dialogue. N'appelle **pas** `getPermission` et n'est donc pas concerné par le contrat d'attente bornée ; l'`AbortSignal` n'est géré via `Promise.race` que lorsqu'un `signal` est fourni, sinon la promesse de `getUserMedia` est renvoyée directement.

## Build

Vite (lib mode) compile `src/index.ts` en 3 formats via `vite.config.js` :
- `cjs` → `dist/index.js`
- `es` → `dist/index.es.js`
- `umd` → `dist/index.umd.js`

Les déclarations de types (`dist/index.d.ts` et fichiers associés) sont générées automatiquement par `vite-plugin-dts` à partir des sources TypeScript — il n'y a plus de `src/index.d.ts` maintenu à la main. Vite nettoie `dist/` automatiquement avant chaque build. Sourcemaps désactivés (`sourcemap: false`).

## CI

Trois workflows GitHub Actions dans `.github/workflows/` :

- `check.yml` : workflow **réutilisable** déclenché sur `pull_request` (vers `main` et `beta`) et via `workflow_call`. Installe les dépendances puis enchaîne `typecheck` + `test:ci` + `lint` + `build`, upload la couverture sur Codecov, et publie `dist/` en artifact **uniquement sur push** (pour que `publish.yml` le réutilise). C'est la validation pré-merge des PR.
- `publish.yml` : sur push `main`/`beta`, appelle d'abord `check.yml` (`secrets: inherit` pour transmettre `CODECOV_TOKEN`), puis le job `publish` (`needs: check`) télécharge l'artifact `dist` au lieu de rebuilder et lance `npx semantic-release`. La publication reste donc protégée par la validation complète.
- `codeql.yml` : analyse de sécurité CodeQL (JavaScript/TypeScript) sur push, PR et un cron hebdomadaire.

## Release

Semantic-release gère versioning + changelog + publish npm automatiquement depuis la CI sur push `main` (canal stable) et `beta` (canal pré-release : ex. `2.0.0-beta.1` publié sous le tag npm `beta`). Les commits de type `chore` déclenchent un patch release (règle custom dans `package.json`).

