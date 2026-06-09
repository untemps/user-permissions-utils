import getPermission, { type GetPermissionOptions } from './getPermission'

/**
 * Watches the `screen-wake-lock` permission and resolves with `'granted'` once it is granted.
 *
 * Thin wrapper around {@link getPermission} with the permission name hardcoded — see
 * `getPermission` for the full passive-watcher contract (bounded wait on `'prompt'`).
 *
 * @param options           Optional settings forwarded to `getPermission`
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getScreenWakeLockPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	getPermission('screen-wake-lock', options)

export default getScreenWakeLockPermission
