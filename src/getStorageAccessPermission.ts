import acquirePermission from './_acquirePermission'
import { storageAccessTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `storage-access` permission: reads the current state and, on `'prompt'`, requests it
 * (via `document.requestStorageAccess`), resolving with `'granted'` once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract. Only meaningful inside a cross-site iframe and must be called from a
 * user gesture, so it works only in that context.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to stop waiting (the underlying prompt keeps running)
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getStorageAccessPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('storage-access', storageAccessTrigger, options)

export default getStorageAccessPermission
