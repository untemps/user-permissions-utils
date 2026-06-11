import acquirePermission from './_acquirePermission'
import { cameraTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `camera` permission, surfacing the real prompt via `getUserMediaStream` and
 * resolving with `'granted'`. Use `getUserMediaStream` directly when you need the stream itself.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getCameraPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('camera', cameraTrigger, options)

export default getCameraPermission
