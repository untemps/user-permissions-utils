# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn test          # tests en mode watch (Vitest)
yarn test:ci       # tests one-shot avec coverage (utilisé par le pre-commit hook et CI)
yarn typecheck     # vérification de types TypeScript (tsc --noEmit)
yarn build         # compile CJS + ES + UMD + déclarations .d.ts vers dist/ via Vite
yarn lint          # ESLint (typescript-eslint) sur src/
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
  └── getPermission
        └── isNavigatorPermissionsSupported (guard)
        └── navigator.permissions.query()

checkPermission
  └── isNavigatorPermissionsSupported  (guard)
  └── navigator.permissions.query()
```

- `isNavigatorPermissionsSupported` / `isNavigatorMediaDevicesSupported` : guards booléens sur l'existence des APIs navigateur.
- `getPermission(permissionName)` : retourne une Promise qui se résout sur l'état de permission (`'granted'` / `'prompt'`) ou rejette avec `DOMException` si refusée ou non supportée. Écoute l'événement `change` pour détecter les changements d'état en temps réel.
- `checkPermission(permissionName)` : retourne une Promise résolue immédiatement avec l'état courant de la permission (`'granted'` / `'denied'` / `'prompt'`), sans attendre d'interaction utilisateur ni rejeter sur `'denied'`. Passe par le même guard `isNavigatorPermissionsSupported` que `getPermission`. Utile pour lire l'état en amont (bannière, bouton désactivé, branchement UI).
- `getUserMediaStream(permissionName, mediaStreamConstraints)` : combine `getPermission` + `navigator.mediaDevices.getUserMedia` via `Promise.all`.

## Build

Vite (lib mode) compile `src/index.ts` en 3 formats via `vite.config.js` :
- `cjs` → `dist/index.js`
- `es` → `dist/index.es.js`
- `umd` → `dist/index.umd.js`

Les déclarations de types (`dist/index.d.ts` et fichiers associés) sont générées automatiquement par `vite-plugin-dts` à partir des sources TypeScript — il n'y a plus de `src/index.d.ts` maintenu à la main. Vite nettoie `dist/` automatiquement avant chaque build. Sourcemaps désactivés (`sourcemap: false`).

## Release

Semantic-release gère versioning + changelog + publish npm automatiquement depuis la CI sur push `main` (canal stable) et `beta` (canal pré-release : ex. `2.0.0-beta.1` publié sous le tag npm `beta`). Les commits de type `chore` déclenchent un patch release (règle custom dans `package.json`).

