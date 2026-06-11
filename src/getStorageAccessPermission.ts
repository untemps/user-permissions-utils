import acquirePermission from './_acquirePermission'
import { storageAccessTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `storage-access` permission via `document.requestStorageAccess`, resolving with
 * `'granted'`. Only meaningful inside a cross-site iframe and must be called from a user gesture.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getStorageAccessPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('storage-access', storageAccessTrigger, options)

export default getStorageAccessPermission
