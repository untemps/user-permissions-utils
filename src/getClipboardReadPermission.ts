import getPermission, { asPermissionName, type GetPermissionOptions } from './getPermission'

/**
 * Watches the `clipboard-read` permission and resolves with `'granted'` once it is granted.
 *
 * **Passive watcher** (thin wrapper around {@link getPermission}): unlike the active getters, it
 * never surfaces a dialog, because the only way to prompt for `clipboard-read` is to actually read
 * the user's clipboard — a privacy-sensitive side effect the library will not perform on your
 * behalf. Trigger the prompt via your real `navigator.clipboard.read()`; this only observes the
 * state, so the **bounded-wait** requirement on `'prompt'` applies (pass `signal` and/or `timeout`).
 *
 * @param options           Optional settings forwarded to `getPermission`
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getClipboardReadPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	getPermission(asPermissionName('clipboard-read'), options)

export default getClipboardReadPermission
