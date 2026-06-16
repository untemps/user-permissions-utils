# [2.2.0](https://github.com/untemps/user-permissions-utils/compare/v2.1.0...v2.2.0) (2026-06-16)


### Features

* Expose a synchronous isPermissionsSupported() predicate ([#180](https://github.com/untemps/user-permissions-utils/issues/180)) ([9178462](https://github.com/untemps/user-permissions-utils/commit/9178462f1756b1b7d1a70a979afb9376ccfe0d35))

# [2.1.0](https://github.com/untemps/user-permissions-utils/compare/v2.0.0...v2.1.0) (2026-06-16)


### Features

* Expose a synchronous isMediaDevicesSupported() predicate ([#178](https://github.com/untemps/user-permissions-utils/issues/178)) ([f3a829e](https://github.com/untemps/user-permissions-utils/commit/f3a829e823e7acfe8ab8cbc535a287776c109213))

# [2.0.0](https://github.com/untemps/user-permissions-utils/compare/v1.3.4...v2.0.0) (2026-06-13)


### Bug Fixes

* Always bump major on breaking changes ([ff89195](https://github.com/untemps/user-permissions-utils/commit/ff89195060bf34c2904117d75f37aaff115ee974))
* getPushPermission queries push with userVisibleOnly and normalizes the non-queryable TypeError ([#169](https://github.com/untemps/user-permissions-utils/issues/169)) ([c597109](https://github.com/untemps/user-permissions-utils/commit/c597109961cedc51f0c691552360626f72a8996f))
* Honour an abort before the denied check in getUserMediaStream ([#150](https://github.com/untemps/user-permissions-utils/issues/150)) ([7f8f580](https://github.com/untemps/user-permissions-utils/commit/7f8f58018f0bcbfa467338af6cace93b95fa6ffe))
* Make getUserMediaStream require only MediaDevices, not the Permissions API ([#173](https://github.com/untemps/user-permissions-utils/issues/173)) ([b162e7e](https://github.com/untemps/user-permissions-utils/commit/b162e7e5c70e171c3883f8ecfd1e752a6f7dbf09))
* Prevent getPermission from hanging on 'prompt' state and leaking a listener ([#135](https://github.com/untemps/user-permissions-utils/issues/135)) ([cf88c8d](https://github.com/untemps/user-permissions-utils/commit/cf88c8d86c60d49f2ca6f3a7640a3cbdc29e4bce))
* Remove the change listener when watchPermission's upfront emit throws ([#155](https://github.com/untemps/user-permissions-utils/issues/155)) ([48b10fe](https://github.com/untemps/user-permissions-utils/commit/48b10fe8b9c533bb286313e1ee42a0ce6b6f96a8))
* Standardize DOMException error names (NotAllowedError/NotSupportedError) ([#163](https://github.com/untemps/user-permissions-utils/issues/163)) ([318817b](https://github.com/untemps/user-permissions-utils/commit/318817bfcbe8a6de0b5a2e8053f00d6912067804))
* Standardize geolocation non-denial failures to DOMException ([#164](https://github.com/untemps/user-permissions-utils/issues/164)) ([4da666c](https://github.com/untemps/user-permissions-utils/commit/4da666cdcfb7599836266bc13b12527e996376d3))
* Stop late-resolving MediaStream tracks when getUserMediaStream is aborted ([#140](https://github.com/untemps/user-permissions-utils/issues/140)) ([c6e6e57](https://github.com/untemps/user-permissions-utils/commit/c6e6e5759d4f2e2d80a14de90b4cc5e5714d951c))
* Surface the prompt when a permission name is not queryable (Firefox/Safari) ([#148](https://github.com/untemps/user-permissions-utils/issues/148)) ([18e8136](https://github.com/untemps/user-permissions-utils/commit/18e8136a96ee45104340ee32c7d688ae42c34283))


### Features

* Accept a PermissionQueryDescriptor in checkPermission & watchPermission ([#174](https://github.com/untemps/user-permissions-utils/issues/174)) ([96120dd](https://github.com/untemps/user-permissions-utils/commit/96120dd348298fbeedbdcfb72ae12b4e8c244b1c))
* Add an optional timeout to getUserMediaStream ([#166](https://github.com/untemps/user-permissions-utils/issues/166)) ([1905d61](https://github.com/untemps/user-permissions-utils/commit/1905d61db3a50d75fd033c60532de82283518a85))
* Add checkPermission utility to query current permission state ([#134](https://github.com/untemps/user-permissions-utils/issues/134)) ([d301703](https://github.com/untemps/user-permissions-utils/commit/d3017038010a390410fe3f2cee46f8b21da446fe))
* Add dedicated permission functions wrapping getPermission ([#141](https://github.com/untemps/user-permissions-utils/issues/141)) ([26ad2c5](https://github.com/untemps/user-permissions-utils/commit/26ad2c51a582cc3f8a4c494006adf3e7e757fceb))
* Add watchPermission to subscribe to live permission state changes ([#143](https://github.com/untemps/user-permissions-utils/issues/143)) ([d75afac](https://github.com/untemps/user-permissions-utils/commit/d75afac7561c121bc417478cccaa4205a1a9b245))
* Migrate codebase to TypeScript ([#132](https://github.com/untemps/user-permissions-utils/issues/132)) ([c47f2ba](https://github.com/untemps/user-permissions-utils/commit/c47f2babd3125ac6a2dce79978649b4a44dbe346))


### Performance Improvements

* Avoid a redundant permissions query on the camera/microphone path ([#149](https://github.com/untemps/user-permissions-utils/issues/149)) ([2a27faf](https://github.com/untemps/user-permissions-utils/commit/2a27faf985b63b69df611aca651d91db37e37fb9))


### BREAKING CHANGES

* POSITION_UNAVAILABLE/TIMEOUT geolocation failures now reject with a DOMException (NotReadableError/TimeoutError) instead of the raw GeolocationPositionError. The numeric `code` moves from the top-level error to `error.cause.code` (the original GeolocationPositionError is preserved as the DOMException's `cause`).
* Errors previously thrown with name 'NOT_ALLOWED_ERR' are now 'NotAllowedError', and 'NOT_SUPPORTED_ERR' is now 'NotSupportedError'. Consumers matching the old names must switch to the standard ones.
* Removed the public `isNavigatorPermissionsSupported` and `isNavigatorMediaDevicesSupported` exports. Their existence checks are now inlined into `getPermission`, `acquirePermission`, `checkPermission` and `getUserMediaStream`, which still throw the same `NOT_SUPPORTED_ERR` DOMException when the API is absent — behaviour and error contract are unchanged. To detect support, call `checkPermission(name)` and catch (it rejects with `NOT_SUPPORTED_ERR` when the Permissions API is missing), or check `'permissions' in navigator` / `'mediaDevices' in navigator` directly.
* `getPermission` no longer waits unboundedly on a `'prompt'` state and now honours an aborted `signal` on every resolved state.
- On a `'prompt'` state with neither `signal` nor `timeout`, it rejects immediately with an `InvalidStateError` instead of returning a promise that never settles. Pass `{ timeout }` and/or `{ signal }` to bound the wait, or trigger the real prompt via `getUserMediaStream`.
- An already-aborted (or aborted-during-query) `signal` now rejects with the signal's reason (e.g. `AbortError`) on every resolved state, including `'granted'`/`'denied'` — previously only the `'prompt'` wait checked it. Callers that abort only after the permission has settled are unaffected.
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
