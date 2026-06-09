import acquirePermission from './_acquirePermission'
import { geolocationTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `geolocation` permission: reads the current state and, on `'prompt'`, surfaces the
 * real browser dialog (via `navigator.geolocation.getCurrentPosition`), resolving with `'granted'`
 * once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to cancel the pending acquisition
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getGeolocationPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('geolocation', geolocationTrigger, options)

export default getGeolocationPermission
