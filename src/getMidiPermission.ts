import acquirePermission from './_acquirePermission'
import { midiTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `midi` permission, surfacing the real prompt via
 * `navigator.requestMIDIAccess({ sysex: false })` and resolving with `'granted'`. Requests only
 * basic (non-sysex) access, so browsers that auto-grant it may resolve without any dialog.
 *
 * Active counterpart to {@link getPermission}; see {@link acquirePermission} for the contract.
 */
const getMidiPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('midi', midiTrigger, options)

export default getMidiPermission
