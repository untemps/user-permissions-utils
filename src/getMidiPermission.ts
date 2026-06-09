import acquirePermission from './_acquirePermission'
import { midiTrigger } from './_triggers'
import type { GetPermissionOptions } from './getPermission'

/**
 * Acquires the `midi` permission: reads the current state and, on `'prompt'`, surfaces the real
 * browser dialog (via `navigator.requestMIDIAccess({ sysex: false })`), resolving with `'granted'`
 * once it is granted.
 *
 * Active counterpart to {@link getPermission} — see {@link acquirePermission} for the full
 * query-then-trigger contract. It requests only the basic (non-sysex) access matching the queried
 * `midi` permission, so browsers that auto-grant non-sysex MIDI may resolve it without any dialog.
 *
 * @param options           Optional settings forwarded to the acquisition
 * @param options.signal    Optional AbortSignal to stop waiting (the underlying prompt keeps running)
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getMidiPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	acquirePermission('midi', midiTrigger, options)

export default getMidiPermission
