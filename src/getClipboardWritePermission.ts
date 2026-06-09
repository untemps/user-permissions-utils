import getPermission, { asPermissionName, type GetPermissionOptions } from './getPermission'

/**
 * Watches the `clipboard-write` permission and resolves with `'granted'` once it is granted.
 *
 * **Passive watcher** (thin wrapper around {@link getPermission}): unlike the active getters, it
 * never surfaces a dialog, because the only way to prompt for `clipboard-write` is to actually
 * overwrite the user's clipboard — a destructive side effect the library will not perform on your
 * behalf. Trigger the prompt via your real `navigator.clipboard.write()`; this only observes the
 * state, so the **bounded-wait** requirement on `'prompt'` applies (pass `signal` and/or `timeout`).
 *
 * @param options           Optional settings forwarded to `getPermission`
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getClipboardWritePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	getPermission(asPermissionName('clipboard-write'), options)

export default getClipboardWritePermission
