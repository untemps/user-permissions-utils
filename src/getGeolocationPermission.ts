import acquirePermission from './_acquirePermission'
import { geolocationTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `geolocation` permission, surfacing the real prompt via
 * `navigator.geolocation.getCurrentPosition` and resolving with `'granted'`.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getGeolocationPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('geolocation', geolocationTrigger, options)

export default getGeolocationPermission
