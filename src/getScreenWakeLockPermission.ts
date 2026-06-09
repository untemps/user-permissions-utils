import acquirePermission from './_acquirePermission'
import { screenWakeLockTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `screen-wake-lock` permission: reads the current state and, on `'prompt'`, requests
 * a lock (via `navigator.wakeLock.request('screen')`) then releases it, resolving with `'granted'`
 * once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract. This permission is policy-gated (no dialog) and requires a visible
 * document, so it rejects when the page is hidden.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to stop waiting (the underlying prompt keeps running)
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getScreenWakeLockPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('screen-wake-lock', screenWakeLockTrigger, options)

export default getScreenWakeLockPermission
