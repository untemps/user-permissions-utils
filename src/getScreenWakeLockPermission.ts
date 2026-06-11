import acquirePermission from './_acquirePermission'
import { screenWakeLockTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `screen-wake-lock` permission via `navigator.wakeLock.request('screen')` (released
 * immediately), resolving with `'granted'`. Policy-gated with no dialog; rejects when the document
 * is hidden.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getScreenWakeLockPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('screen-wake-lock', screenWakeLockTrigger, options)

export default getScreenWakeLockPermission
