import acquirePermission from './_acquirePermission'
import { microphoneTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `microphone` permission, surfacing the real prompt via `getUserMediaStream` and
 * resolving with `'granted'`. Use `getUserMediaStream` directly when you need the stream itself.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getMicrophonePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('microphone', microphoneTrigger, options)

export default getMicrophonePermission
