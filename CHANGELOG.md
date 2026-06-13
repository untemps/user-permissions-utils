# [2.0.0-beta.21](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.20...v2.0.0-beta.21) (2026-06-13)


### Features

* Accept a PermissionQueryDescriptor in checkPermission & watchPermission ([#174](https://github.com/untemps/user-permissions-utils/issues/174)) ([97dfe3d](https://github.com/untemps/user-permissions-utils/commit/97dfe3d12286b1a8ce2c56a55a47fbe1132a9aeb))

# [2.0.0-beta.20](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.19...v2.0.0-beta.20) (2026-06-13)


### Bug Fixes

* Make getUserMediaStream require only MediaDevices, not the Permissions API ([#173](https://github.com/untemps/user-permissions-utils/issues/173)) ([9cbc1e3](https://github.com/untemps/user-permissions-utils/commit/9cbc1e3a5c0da5355e3931a3ad9255acbefe65b8))

# [2.0.0-beta.19](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.18...v2.0.0-beta.19) (2026-06-13)


### Bug Fixes

* getPushPermission queries push with userVisibleOnly and normalizes the non-queryable TypeError ([#169](https://github.com/untemps/user-permissions-utils/issues/169)) ([b11bb6f](https://github.com/untemps/user-permissions-utils/commit/b11bb6f79f7996f8059f814a614ea439bc83b3c5))

# [2.0.0-beta.18](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.17...v2.0.0-beta.18) (2026-06-12)


### Features

* Add an optional timeout to getUserMediaStream ([#166](https://github.com/untemps/user-permissions-utils/issues/166)) ([557978c](https://github.com/untemps/user-permissions-utils/commit/557978c90db06122c53ef6febabdb36c29b9877d))

# [2.0.0-beta.17](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.16...v2.0.0-beta.17) (2026-06-12)

# [2.0.0-beta.16](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.15...v2.0.0-beta.16) (2026-06-12)


### Bug Fixes

* Standardize geolocation non-denial failures to DOMException ([#164](https://github.com/untemps/user-permissions-utils/issues/164)) ([a4a303a](https://github.com/untemps/user-permissions-utils/commit/a4a303aeb61e79d24e9f5e804b24637555fe525f))


### BREAKING CHANGES

* POSITION_UNAVAILABLE/TIMEOUT geolocation failures now reject with a DOMException (NotReadableError/TimeoutError) instead of the raw GeolocationPositionError. The numeric `code` moves from the top-level error to `error.ca

# [2.0.0-beta.15](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.14...v2.0.0-beta.15) (2026-06-12)


* fix!: Standardize DOMException error names (NotAllowedError/NotSupportedError) ([#163](https://github.com/untemps/user-permissions-utils/issues/163)) ([bcfa085](https://github.com/untemps/user-permissions-utils/commit/bcfa0854bcb102293fcd9d1fef1a563c651325de))


### BREAKING CHANGES

* Errors previously thrown with name 'NOT_ALLOWED_ERR' are now 'NotAllowedError', and 'NOT_SUPPORTED_ERR' is now 'NotSupportedError'. Consumers matching the old names must switch to the standard ones.

# [2.0.0-beta.14](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.13...v2.0.0-beta.14) (2026-06-12)

# [2.0.0-beta.13](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.12...v2.0.0-beta.13) (2026-06-12)


### Bug Fixes

* Remove the change listener when watchPermission's upfront emit throws ([#155](https://github.com/untemps/user-permissions-utils/issues/155)) ([2051615](https://github.com/untemps/user-permissions-utils/commit/2051615a8b0f3da2c5f622d3fc319e72b2d8b441))

# [2.0.0-beta.12](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.11...v2.0.0-beta.12) (2026-06-12)


### Bug Fixes

* Honour an abort before the denied check in getUserMediaStream ([#150](https://github.com/untemps/user-permissions-utils/issues/150)) ([66a406c](https://github.com/untemps/user-permissions-utils/commit/66a406cb760580486305460f5ab104bf491e0a9c))

# [2.0.0-beta.11](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.10...v2.0.0-beta.11) (2026-06-12)


### Performance Improvements

* Avoid a redundant permissions query on the camera/microphone path ([#149](https://github.com/untemps/user-permissions-utils/issues/149)) ([eb5348a](https://github.com/untemps/user-permissions-utils/commit/eb5348a28b358a4f6c849889c8ec93389d14be94))

# [2.0.0-beta.10](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.9...v2.0.0-beta.10) (2026-06-12)


### Bug Fixes

* Surface the prompt when a permission name is not queryable (Firefox/Safari) ([#148](https://github.com/untemps/user-permissions-utils/issues/148)) ([67aa4a5](https://github.com/untemps/user-permissions-utils/commit/67aa4a581181850387385f8389b470be2be717fb))

# [2.0.0-beta.9](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.8...v2.0.0-beta.9) (2026-06-11)


### Features

* Add watchPermission to subscribe to live permission state changes ([#143](https://github.com/untemps/user-permissions-utils/issues/143)) ([9373004](https://github.com/untemps/user-permissions-utils/commit/93730046259368d97768a146fe77c94572412b7c))

# [2.0.0-beta.8](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.7...v2.0.0-beta.8) (2026-06-11)


### Features

* Add dedicated permission functions wrapping getPermission ([#141](https://github.com/untemps/user-permissions-utils/issues/141)) ([ba2e000](https://github.com/untemps/user-permissions-utils/commit/ba2e000f3da80129e8221803f773c38c13d93b74))


### BREAKING CHANGES

* Removed the public `isNavigatorPermissionsSupported` and `isNavigatorMediaDevicesSupported` exports. Their existence checks are now inlined into `getPermission`, `acquirePermission`, `checkPermission` and `getUserMediaStream`, which still throw the same `NOT_SUPPORTED_ERR` DOMException when the API is absent — behaviour and error contract are unchanged. To detect support, call `checkPermission(name)` and catch (it rejects with `NOT_SUPPORTED_ERR` when the Permissions API is missing), or check `'permissions' in navigator` / `'mediaDevices' in navigator` directly.

# [2.0.0-beta.7](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.6...v2.0.0-beta.7) (2026-06-08)


### Bug Fixes

* Stop late-resolving MediaStream tracks when getUserMediaStream is aborted ([#140](https://github.com/untemps/user-permissions-utils/issues/140)) ([15657a2](https://github.com/untemps/user-permissions-utils/commit/15657a2a739dd90580d7c8638730deaa0935c044))

# [2.0.0-beta.6](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.5...v2.0.0-beta.6) (2026-06-08)

# [2.0.0-beta.5](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.4...v2.0.0-beta.5) (2026-06-07)

# [2.0.0-beta.4](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.3...v2.0.0-beta.4) (2026-06-07)


### Bug Fixes

* Prevent getPermission from hanging on 'prompt' state and leaking a listener ([#135](https://github.com/untemps/user-permissions-utils/issues/135)) ([d69e68f](https://github.com/untemps/user-permissions-utils/commit/d69e68fc68f5c45dfa56dd52c4ca7c262eb579c1))


### BREAKING CHANGES

* `getPermission` no longer waits unboundedly on a `'prompt'` state and now honours an aborted `signal` on every resolved state.
- On a `'prompt'` state with neither `signal` nor `timeout`, it rejects immediately with an `InvalidStateError` instead of returning a promise that never settles. Pass `{ timeout }` and/or `{ signal }` to bound the wait, or trigger the real prompt via `getUserMediaStream`.
- An already-aborted (or aborted-during-query) `signal` now rejects with the signal's reason (e.g. `AbortError`) on every resolved state, including `'granted'`/`'denied'` — previously only the `'prompt'` wait checked it. Callers that abort only after the permission has settled are unaffected.

# [2.0.0-beta.3](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.2...v2.0.0-beta.3) (2026-06-06)


### Features

* Add checkPermission utility to query current permission state ([#134](https://github.com/untemps/user-permissions-utils/issues/134)) ([c8be998](https://github.com/untemps/user-permissions-utils/commit/c8be998722a072bd1cce2fea4efe8435d9a414e8))

# [2.0.0-beta.2](https://github.com/untemps/user-permissions-utils/compare/v2.0.0-beta.1...v2.0.0-beta.2) (2026-06-06)

# [2.0.0-beta.1](https://github.com/untemps/user-permissions-utils/compare/v1.3.4...v2.0.0-beta.1) (2026-06-06)


### Bug Fixes

* **release:** Always bump major on breaking changes ([123798a](https://github.com/untemps/user-permissions-utils/commit/123798a518338ebdd9599677a20f6fdea1e53364))


### chore

* Migrate codebase to TypeScript ([#132](https://github.com/untemps/user-permissions-utils/issues/132)) ([dd21810](https://github.com/untemps/user-permissions-utils/commit/dd21810ed90308cea8ace939e10e018ae79d3db2))


### BREAKING CHANGES

* The package is now written in TypeScript and ships generated type declarations. Types may be stricter (narrower) for some consumers, though the public signatures are unchanged.

## [1.3.4](https://github.com/untemps/user-permissions-utils/compare/v1.3.3...v1.3.4) (2026-05-17)

## [1.3.3](https://github.com/untemps/user-permissions-utils/compare/v1.3.2...v1.3.3) (2026-05-17)

## [1.3.2](https://github.com/untemps/user-permissions-utils/compare/v1.3.1...v1.3.2) (2026-05-17)


### Bug Fixes

* Forward AbortSignal to getUserMedia via Promise.race ([#122](https://github.com/untemps/user-permissions-utils/issues/122)) ([f553efc](https://github.com/untemps/user-permissions-utils/commit/f553efccff822d7e5e77a55fa9ce72e0de7dc5bd))

## [1.3.1](https://github.com/untemps/user-permissions-utils/compare/v1.3.0...v1.3.1) (2026-05-17)


### Bug Fixes

* Resolve getUserMediaStream deadlock when permission is in 'prompt' state ([#119](https://github.com/untemps/user-permissions-utils/issues/119)) ([78e2aa9](https://github.com/untemps/user-permissions-utils/commit/78e2aa993cb6980600b1093a18b3288a5429a143))

# [1.3.0](https://github.com/untemps/user-permissions-utils/compare/v1.2.5...v1.3.0) (2026-05-14)


### Features

* Add AbortSignal support for cancellation to getUserMediaStream ([#110](https://github.com/untemps/user-permissions-utils/issues/110)) ([6f8d302](https://github.com/untemps/user-permissions-utils/commit/6f8d302ce3f6063e64708bca231a8706c62a63fd))

## [1.2.5](https://github.com/untemps/user-permissions-utils/compare/v1.2.4...v1.2.5) (2026-05-14)

## [1.2.4](https://github.com/untemps/user-permissions-utils/compare/v1.2.3...v1.2.4) (2026-05-14)

## [1.2.3](https://github.com/untemps/user-permissions-utils/compare/v1.2.2...v1.2.3) (2026-05-14)

## [1.2.2](https://github.com/untemps/user-permissions-utils/compare/v1.2.1...v1.2.2) (2026-05-14)

## [1.2.1](https://github.com/untemps/user-permissions-utils/compare/v1.2.0...v1.2.1) (2026-05-14)

# [1.2.0](https://github.com/untemps/user-permissions-utils/compare/v1.1.38...v1.2.0) (2026-05-14)


### Features

* Add AbortSignal support for cancellation ([#91](https://github.com/untemps/user-permissions-utils/issues/91)) ([8eb13fc](https://github.com/untemps/user-permissions-utils/commit/8eb13fc08449699841a09b6f150955151acef7f7))

## [1.1.38](https://github.com/untemps/user-permissions-utils/compare/v1.1.37...v1.1.38) (2026-05-14)

## [1.1.37](https://github.com/untemps/user-permissions-utils/compare/v1.1.36...v1.1.37) (2026-05-14)

## [1.1.36](https://github.com/untemps/user-permissions-utils/compare/v1.1.35...v1.1.36) (2026-05-14)

## [1.1.35](https://github.com/untemps/user-permissions-utils/compare/v1.1.34...v1.1.35) (2026-05-14)

## [1.1.34](https://github.com/untemps/user-permissions-utils/compare/v1.1.33...v1.1.34) (2026-05-14)

## [1.1.33](https://github.com/untemps/user-permissions-utils/compare/v1.1.32...v1.1.33) (2026-05-14)


### Bug Fixes

* Replace no-op Promise.all with explicit sequential awaits ([#82](https://github.com/untemps/user-permissions-utils/issues/82)) ([06c428c](https://github.com/untemps/user-permissions-utils/commit/06c428c3c066d86d80a861936f6b0080b8487581))

## [1.1.32](https://github.com/untemps/user-permissions-utils/compare/v1.1.31...v1.1.32) (2026-05-14)


### Bug Fixes

* Remove new Promise(async executor) anti-pattern in getPermission and getUserMediaStream ([#81](https://github.com/untemps/user-permissions-utils/issues/81)) ([30d60e6](https://github.com/untemps/user-permissions-utils/commit/30d60e660120493c3c55c5ef558f9186d637eef7))

## [1.1.31](https://github.com/untemps/user-permissions-utils/compare/v1.1.30...v1.1.31) (2026-05-13)


### Bug Fixes

* Return after reject() in unsupported-API guard clauses ([#80](https://github.com/untemps/user-permissions-utils/issues/80)) ([c43f87e](https://github.com/untemps/user-permissions-utils/commit/c43f87e5870c3383082042a0f880d3584112d0bd))

## [1.1.30](https://github.com/untemps/user-permissions-utils/compare/v1.1.29...v1.1.30) (2026-05-13)


### Bug Fixes

* Do not resolve promise when permission state is 'prompt' ([#79](https://github.com/untemps/user-permissions-utils/issues/79)) ([005441b](https://github.com/untemps/user-permissions-utils/commit/005441b384d81cbcb5e93249d12cc403810cb636))

## [1.1.29](https://github.com/untemps/user-permissions-utils/compare/v1.1.28...v1.1.29) (2026-05-13)

## [1.1.28](https://github.com/untemps/user-permissions-utils/compare/v1.1.27...v1.1.28) (2026-05-13)

## [1.1.27](https://github.com/untemps/user-permissions-utils/compare/v1.1.26...v1.1.27) (2025-12-08)

## [1.1.26](https://github.com/untemps/user-permissions-utils/compare/v1.1.25...v1.1.26) (2024-12-13)

## [1.1.25](https://github.com/untemps/user-permissions-utils/compare/v1.1.24...v1.1.25) (2024-11-22)

## [1.1.24](https://github.com/untemps/user-permissions-utils/compare/v1.1.23...v1.1.24) (2024-06-20)

## [1.1.23](https://github.com/untemps/user-permissions-utils/compare/v1.1.22...v1.1.23) (2024-04-11)

## [1.1.22](https://github.com/untemps/user-permissions-utils/compare/v1.1.21...v1.1.22) (2024-03-06)

## [1.1.21](https://github.com/untemps/user-permissions-utils/compare/v1.1.20...v1.1.21) (2023-10-17)

## [1.1.20](https://github.com/untemps/user-permissions-utils/compare/v1.1.19...v1.1.20) (2023-07-21)

## [1.1.19](https://github.com/untemps/user-permissions-utils/compare/v1.1.18...v1.1.19) (2023-07-13)

## [1.1.18](https://github.com/untemps/user-permissions-utils/compare/v1.1.17...v1.1.18) (2023-07-13)

## [1.1.17](https://github.com/untemps/user-permissions-utils/compare/v1.1.16...v1.1.17) (2023-02-08)

## [1.1.16](https://github.com/untemps/user-permissions-utils/compare/v1.1.15...v1.1.16) (2023-01-08)

## [1.1.15](https://github.com/untemps/user-permissions-utils/compare/v1.1.14...v1.1.15) (2022-12-10)

## [1.1.14](https://github.com/untemps/user-permissions-utils/compare/v1.1.13...v1.1.14) (2022-07-24)

## [1.1.13](https://github.com/untemps/user-permissions-utils/compare/v1.1.12...v1.1.13) (2022-07-06)

## [1.1.12](https://github.com/untemps/user-permissions-utils/compare/v1.1.11...v1.1.12) (2022-07-06)

## [1.1.11](https://github.com/untemps/user-permissions-utils/compare/v1.1.10...v1.1.11) (2022-06-06)

## [1.1.10](https://github.com/untemps/user-permissions-utils/compare/v1.1.9...v1.1.10) (2022-04-01)

## [1.1.9](https://github.com/untemps/user-permissions-utils/compare/v1.1.8...v1.1.9) (2022-02-02)

## [1.1.8](https://github.com/untemps/user-permissions-utils/compare/v1.1.7...v1.1.8) (2022-01-30)

## [1.1.7](https://github.com/untemps/user-permissions-utils/compare/v1.1.6...v1.1.7) (2021-09-25)

## [1.1.6](https://github.com/untemps/user-permissions-utils/compare/v1.1.5...v1.1.6) (2021-09-25)

## [1.1.5](https://github.com/untemps/user-permissions-utils/compare/v1.1.4...v1.1.5) (2021-08-20)

## [1.1.4](https://github.com/untemps/user-permissions-utils/compare/v1.1.3...v1.1.4) (2021-07-03)

## [1.1.3](https://github.com/untemps/user-permissions-utils/compare/v1.1.2...v1.1.3) (2021-07-03)

## [1.1.2](https://github.com/untemps/user-permissions-utils/compare/v1.1.1...v1.1.2) (2021-07-03)

## [1.1.1](https://github.com/untemps/user-permissions-utils/compare/v1.1.0...v1.1.1) (2021-07-03)

# [1.1.0](https://github.com/untemps/user-permissions-utils/compare/v1.0.3...v1.1.0) (2021-05-23)


### Features

* Expose flags to check browser support ([#22](https://github.com/untemps/user-permissions-utils/issues/22)) ([f1466d9](https://github.com/untemps/user-permissions-utils/commit/f1466d9f6ee3e31161e870380207971dffa388be))

## [1.0.3](https://github.com/untemps/user-permissions-utils/compare/v1.0.2...v1.0.3) (2021-05-23)

## [1.0.2](https://github.com/untemps/user-permissions-utils/compare/v1.0.1...v1.0.2) (2021-05-23)


### Bug Fixes

* Replace error name when navigator.permissions is not supported ([#16](https://github.com/untemps/user-permissions-utils/issues/16)) ([f095e4b](https://github.com/untemps/user-permissions-utils/commit/f095e4bfac7488187dc722f0952eb13ceffee2ae))

## [1.0.1](https://github.com/untemps/user-permissions-utils/compare/v1.0.0...v1.0.1) (2020-06-28)


### Bug Fixes

* Fix prompt permission ([#2](https://github.com/untemps/user-permissions-utils/issues/2)) ([d3ac985](https://github.com/untemps/user-permissions-utils/commit/d3ac98524a62ca182842b0e237c1c401bf711f07))

# 1.0.0 (2020-06-23)


### Features

* Initial commit ([ca3ff95](https://github.com/untemps/user-permissions-utils/commit/ca3ff95611d4445d39295d3c2a2c5ad3f86cfe31))
