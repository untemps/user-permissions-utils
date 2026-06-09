import getPermission, { type GetPermissionOptions } from './getPermission'

/**
 * Watches the `push` permission and resolves with `'granted'` once it is granted.
 *
 * **Passive watcher** (thin wrapper around {@link getPermission}): unlike the active getters, it
 * never surfaces a dialog, because acquiring `push` requires consumer-owned infrastructure the
 * library cannot synthesize from a permission name (a registered service worker and a VAPID key).
 * Trigger the prompt yourself via `pushManager.subscribe(...)`; this only observes the state, so
 * the **bounded-wait** requirement on `'prompt'` applies (pass `signal` and/or `timeout`).
 *
 * @param options           Optional settings forwarded to `getPermission`
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getPushPermission = (options?: GetPermissionOptions): Promise<'granted'> => getPermission('push', options)

export default getPushPermission
