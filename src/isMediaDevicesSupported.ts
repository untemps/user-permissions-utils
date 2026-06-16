/**
 * Returns whether `navigator.mediaDevices.getUserMedia` is available — a pure, synchronous,
 * side-effect-free support check for the MediaDevices API.
 *
 * This is the MediaDevices counterpart to feature-detecting the Permissions API: where the latter
 * is read asynchronously via {@link checkPermission} (which probes `navigator.permissions`), there
 * is no async browser API for MediaDevices, so a synchronous property-presence predicate is the
 * right shape. Unlike `getUserMediaStream` / `getMicrophonePermission`, it never touches the device
 * nor surfaces a prompt.
 *
 * SSR-safe: reads through `globalThis.navigator?.…`, so it returns `false` cleanly when there is no
 * `navigator` global instead of throwing a `ReferenceError`.
 */
const isMediaDevicesSupported = (): boolean => !!globalThis.navigator?.mediaDevices?.getUserMedia

export default isMediaDevicesSupported
