import acquirePermission from './_acquirePermission'
import { persistentStorageTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `persistent-storage` permission via `navigator.storage.persist`, resolving with
 * `'granted'`. Chromium decides this heuristically with no dialog, so it may settle without any
 * user interaction.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getPersistentStoragePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('persistent-storage', persistentStorageTrigger, options)

export default getPersistentStoragePermission
