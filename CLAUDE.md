# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn test          # tests en mode watch (Vitest)
yarn test:ci       # tests one-shot avec coverage (utilisé par le pre-commit hook et CI)
yarn build         # compile CJS + ES + UMD vers dist/ via Vite
yarn prettier      # formate tous les .js (hors .prettierignore)
```

Lancer un test unique :
```bash
yarn test:ci --reporter=verbose getPermission
```

Le pre-commit hook exécute automatiquement `test:ci` + `prettier` via Husky 9 (`.husky/pre-commit`).

## Architecture

Bibliothèque utilitaire légère (~4 fonctions) qui encapsule les APIs navigateur `navigator.permissions` et `navigator.mediaDevices`.

**Flux d'appel :**
```
getUserMediaStream
  └── isNavigatorPermissionsSupported  (guard)
  └── isNavigatorMediaDevicesSupported (guard)
  └── getPermission
        └── isNavigatorPermissionsSupported (guard)
        └── navigator.permissions.query()
```

- `isNavigatorPermissionsSupported` / `isNavigatorMediaDevicesSupported` : guards booléens sur l'existence des APIs navigateur.
- `getPermission(permissionName)` : retourne une Promise qui se résout sur l'état de permission (`'granted'` / `'prompt'`) ou rejette avec `DOMException` si refusée ou non supportée. Écoute l'événement `change` pour détecter les changements d'état en temps réel.
- `getUserMediaStream(permissionName, mediaStreamConstraints)` : combine `getPermission` + `navigator.mediaDevices.getUserMedia` via `Promise.all`.

## Build

Vite (lib mode) compile `src/index.js` en 3 formats via `vite.config.js` :
- `cjs` → `dist/index.js`
- `es` → `dist/index.es.js`
- `umd` → `dist/index.umd.js`

Vite nettoie `dist/` automatiquement avant chaque build. Sourcemaps activés.

## Release

Semantic-release gère versioning + changelog + publish npm automatiquement depuis la CI sur push `main`. Les commits de type `chore` déclenchent un patch release (règle custom dans `package.json`).

