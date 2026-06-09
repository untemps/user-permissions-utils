import acquirePermission from './_acquirePermission'
import { cameraTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `camera` permission: reads the current state and, on `'prompt'`, surfaces the
 * real browser dialog (via `getUserMediaStream`), resolving with `'granted'` once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract. Use `getUserMediaStream` directly when you need the stream itself.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to cancel the pending acquisition
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getCameraPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('camera', cameraTrigger, options)

export default getCameraPermission
