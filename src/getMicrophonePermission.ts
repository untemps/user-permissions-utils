import acquirePermission from './_acquirePermission'
import { microphoneTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `microphone` permission: reads the current state and, on `'prompt'`, surfaces the
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
const getMicrophonePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('microphone', microphoneTrigger, options)

export default getMicrophonePermission
