# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn test          # tests en mode watch (Vitest)
yarn test:ci       # tests one-shot avec coverage (utilisé par le pre-commit hook et CI)
yarn typecheck     # vérification de types TypeScript (tsc --noEmit)
yarn build         # compile CJS + ES + UMD + déclarations .d.ts vers dist/ via Vite
yarn lint          # ESLint (typescript-eslint) sur tout le dépôt (src/, demo/, fichiers de config)
yarn prettier      # formate tous les .js / .ts (hors .prettierignore) — réécriture en place
yarn format:check  # vérifie le formatage Prettier sans réécrire (utilisé par la CI ; échoue si un fichier n'est pas formaté)
```

Lancer un test unique :
```bash
yarn test:ci --reporter=verbose getPermission
```

Le pre-commit hook exécute automatiquement `typecheck` + `test:ci` + `lint` + `lint-staged` via Husky 9 (`.husky/pre-commit`). `lint-staged` (config dans `package.json`) lance `prettier --write` uniquement sur les fichiers `.js`/`.ts` **stagés** puis les re-stage, garantissant que le contenu commité est bien formaté (contrairement à l'ancien `yarn prettier --write` global qui ne re-stagait pas). Le formatage est aussi vérifié en CI via `format:check`.

## Architecture

Bibliothèque utilitaire légère (~5 fonctions) écrite en **TypeScript**, qui encapsule les APIs navigateur `navigator.permissions` et `navigator.mediaDevices`. Les types des APIs navigateur (`PermissionName`, `PermissionState`, `MediaStreamConstraints`, `AbortSignal`) proviennent de la lib `DOM` de TypeScript.

**Flux d'appel :**
```
getUserMediaStream
  └── garde inline `!navigator.mediaDevices` uniquement (lève NotSupportedError) — la Permissions API n'est PAS requise
  └── if (navigator.permissions) navigator.permissions.query()   (rejette si 'denied' ; un TypeError de nom non interrogeable est avalé → fallthrough vers acquireMediaStream ; si navigator.permissions est absent, le query est entièrement sauté → même fallthrough)
  └── acquireMediaStream()                  (garde `!navigator.mediaDevices` + getUserMedia + Promise.race avec le signal, uniquement si fourni ; réutilisé par les triggers caméra/micro sans re-query)

getPermission
  └── garde inline `!navigator.permissions` (lève NotSupportedError)
  └── navigator.permissions.query()
  └── (sur 'prompt') attend l'événement 'change', borné par signal/timeout

checkPermission
  └── garde inline `!navigator.permissions` (lève NotSupportedError)
  └── navigator.permissions.query()
```

- Chaque point d'entrée vérifie **en ligne** l'existence de l'API navigateur (`!navigator.permissions`) et lève `NotSupportedError` si elle est absente — **sauf `getUserMediaStream`**, qui ne garde que `!navigator.mediaDevices` et traite la Permissions API comme best-effort (voir plus bas). Détection de support côté consommateur : pour l'**API Permissions**, il n'y a **pas** de helper `is…Supported` — on passe par `checkPermission` (qui rejette/propage l'erreur de `query()`). Pour **`mediaDevices`**, en revanche, `checkPermission` ne convient pas (il sonde `navigator.permissions`, est asynchrone, et lève sur les navigateurs où `mediaDevices` est précisément à détecter) : le seul prédicat de détection exporté est `isMediaDevicesSupported` (voir plus bas).
- `isMediaDevicesSupported()` : prédicat **pur, synchrone, sans effet de bord, SSR-safe** (`(): boolean`) qui retourne `!!globalThis.navigator?.mediaDevices?.getUserMedia`. Seul helper `is…Supported` de la lib, ré-introduit délibérément **uniquement** pour `mediaDevices` (la détection y est intrinsèquement synchrone : test de présence de propriété, sans API navigateur async correspondante). Ne touche pas `navigator.permissions`, ne déclenche aucun prompt, ne lève jamais (le chaînage optionnel via `globalThis.navigator?.…` évite toute `ReferenceError` côté SSR). Volontairement, **pas** d'`isPermissionsSupported` : `checkPermission` reste le chemin recommandé pour l'API Permissions.
- `getPermission(permissionName, { signal?, timeout? })` : watcher **passif** qui résout sur `'granted'` une fois la permission accordée. `navigator.permissions.query()` n'affiche **jamais** de dialogue : `'granted'` résout immédiatement, `'denied'` rejette (`NotAllowedError`). Sur `'prompt'`, attend l'événement `change` (déclenché seulement quand autre chose provoque la vraie requête, ex. `getUserMediaStream`) ; comme rien ne fait transitionner l'état tout seul, l'attente doit être **bornée** par `timeout` (rejette `TimeoutError`) et/ou `signal`. Sans aucune des deux sur `'prompt'`, rejette immédiatement (`InvalidStateError`) au lieu de rester pendante à jamais. Le listener `change` est nettoyé sur tous les chemins de résolution.
- `checkPermission(permission)` : retourne une Promise résolue immédiatement avec l'état courant de la permission (`'granted'` / `'denied'` / `'prompt'`), sans attendre d'interaction utilisateur ni rejeter sur `'denied'`. Passe par la même garde inline `!navigator.permissions` que `getPermission`. Accepte un `PermissionName` **ou** un `PermissionQueryDescriptor` (normalisé via `typeof permission === 'string' ? { name: permission } : permission` avant `query()`, comme `getPermission`), ce qui permet de lire `push` (`{ name: 'push', userVisibleOnly: true }`) et les noms clipboard typés. Utile pour lire l'état en amont (bannière, bouton désactivé, branchement UI). `watchPermission` (observateur continu via l'événement `change`) applique exactement le même élargissement de signature.
- `getUserMediaStream(permissionName, mediaStreamConstraints, { signal? })` : ne requiert que `navigator.mediaDevices` ; la `query()` des permissions n'est qu'une **optimisation best-effort** pour court-circuiter un refus antérieur, pas un prérequis. Quand `navigator.permissions` existe, appelle `navigator.permissions.query()` (rejette si `'denied'`) puis délègue à `acquireMediaStream` — le cœur `getUserMedia()` (c'est `getUserMedia` qui déclenche le vrai dialogue). N'appelle **pas** `getPermission` et n'est donc pas concerné par le contrat d'attente bornée ; l'`AbortSignal` n'est géré via `Promise.race` que lorsqu'un `signal` est fourni, sinon la promesse de `getUserMedia` est renvoyée directement. La `query()` est enveloppée dans `if (navigator.permissions) { try/catch }` : si `navigator.permissions` est absent (ex. Safari ancien) le query est **entièrement sauté** ; un `TypeError` (nom de permission non interrogeable, ex. Firefox/Safari pour `camera`/`microphone`/`midi`) est avalé ; dans les deux cas le flux retombe sur l'API native. Toute autre erreur se propage. Le chemin actif `_acquirePermission` (getters caméra/micro/midi…) applique le même fallthrough sur `TypeError`, en le traitant comme `'prompt'` pour déclencher le trigger.
- `acquireMediaStream(mediaStreamConstraints, signal?)` : helper interne extrait de `getUserMediaStream` — garde `!navigator.mediaDevices` (`NotSupportedError`), `getUserMedia()`, et le teardown de la stream sur abort (`Promise.race` + arrêt des tracks d'une stream qui résout après l'abort). Réutilisé tel quel par `cameraTrigger`/`microphoneTrigger`, qui l'appellent **sans** repasser par la `query()` de `getUserMediaStream` puisque `_acquirePermission` a déjà interrogé l'état : **une seule `query()` par acquisition** côté getters caméra/micro.

## Build

Vite (lib mode) compile `src/index.ts` en 3 formats via `vite.config.js` :
- `cjs` → `dist/index.js`
- `es` → `dist/index.es.js`
- `umd` → `dist/index.umd.js`

Les déclarations de types (`dist/index.d.ts` et fichiers associés) sont générées automatiquement par `vite-plugin-dts` à partir des sources TypeScript — il n'y a plus de `src/index.d.ts` maintenu à la main. Vite nettoie `dist/` automatiquement avant chaque build. Sourcemaps désactivés (`sourcemap: false`).

## CI

Trois workflows GitHub Actions dans `.github/workflows/` :

- `check.yml` : workflow **réutilisable** déclenché sur `pull_request` (vers `main` et `beta`) et via `workflow_call`. Installe les dépendances puis enchaîne `typecheck` + `test:ci` + `lint` + `format:check` + `build`, upload la couverture sur Codecov, et publie `dist/` en artifact **uniquement sur push** (pour que `publish.yml` le réutilise). C'est la validation pré-merge des PR.
- `publish.yml` : sur push `main`/`beta`, appelle d'abord `check.yml` (`secrets: inherit` pour transmettre `CODECOV_TOKEN`), puis le job `publish` (`needs: check`) télécharge l'artifact `dist` au lieu de rebuilder et lance `npx semantic-release`. La publication reste donc protégée par la validation complète.
- `codeql.yml` : analyse de sécurité CodeQL (JavaScript/TypeScript) sur push, PR et un cron hebdomadaire.

## Release

Semantic-release gère versioning + changelog + publish npm automatiquement depuis la CI sur push `main` (canal stable) et `beta` (canal pré-release : ex. `2.0.0-beta.1` publié sous le tag npm `beta`). Les commits de type `chore` déclenchent un patch release (règle custom dans `package.json`).

