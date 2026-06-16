/**
 * Returns whether `navigator.permissions.query` is available — a pure, synchronous,
 * side-effect-free support check for the Permissions API.
 *
 * This is the API-presence counterpart to {@link checkPermission}: the two answer different
 * questions. `isPermissionsSupported` is a synchronous precondition gate ("is the Permissions API
 * here at all?"), usable from a constructor, a computed property, or conditional rendering. Reading
 * an actual permission **state** (`'granted'` / `'denied'` / `'prompt'`) stays asynchronous by
 * nature — the effective state lives outside the renderer (browser process, persistent storage,
 * Permissions Policy) — so `checkPermission` remains the only way to read it. Note that a rejected
 * `checkPermission` is a poor presence proxy: a non-queryable name (`camera`/`microphone` on
 * Firefox) throws a `TypeError` even though `navigator.permissions` is present.
 *
 * Tests `.query` — the method the library actually calls — rather than the mere presence of the
 * `permissions` object. SSR-safe: reads through `globalThis.navigator?.…`, so it returns `false`
 * cleanly when there is no `navigator` global instead of throwing a `ReferenceError`.
 */
const isPermissionsSupported = (): boolean => !!globalThis.navigator?.permissions?.query

export default isPermissionsSupported
