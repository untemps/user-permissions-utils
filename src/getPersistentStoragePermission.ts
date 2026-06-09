import acquirePermission from './_acquirePermission'
import { persistentStorageTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `persistent-storage` permission: reads the current state and, on `'prompt'`,
 * requests it (via `navigator.storage.persist`), resolving with `'granted'` once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract. Note that Chromium decides this one heuristically without showing a
 * dialog, so it may resolve or reject without any user interaction.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to cancel the pending acquisition
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getPersistentStoragePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('persistent-storage', persistentStorageTrigger, options)

export default getPersistentStoragePermission
