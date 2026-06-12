import boundedWait from './_boundedWait'
import type { GetPermissionOptions } from './getPermission'

// A native call that surfaces a permission's real dialog. It must resolve **only** once the
// permission is granted and reject with a `DOMException` otherwise (`NotAllowedError` on
// denial/dismissal, `NotSupportedError` when its native API is absent), so `acquirePermission` can
// treat every permission identically.
export type PermissionTrigger = (signal?: AbortSignal) => Promise<unknown>

/**
 * Actively acquires a permission: queries the current state and, on `'prompt'`, fires the native
 * `trigger` that surfaces the real dialog, resolving with `'granted'` once granted. Generalises
 * {@link getUserMediaStream}'s query-then-trigger pattern to any permission.
 *
 * Unlike the passive {@link getPermission}, the trigger itself settles `'prompt'`, so `signal` /
 * `timeout` are optional — but advisable for unattended flows (otherwise the wait lasts as long as
 * the prompt). The merged signal is forwarded to the trigger: one that honours it (camera/microphone)
 * tears down its resource on cancel; one that ignores it just stops being awaited, leaving its prompt up.
 *
 * @param permissionName    Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param trigger           Native call that surfaces the prompt (resolve = granted, reject = not granted)
 * @param options.signal    Optional AbortSignal to cancel the pending acquisition
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError`
 * @returns A promise resolved with `'granted'`
 * @throws {DOMException} `NotSupportedError`, `NotAllowedError` (denied) or `TimeoutError`
 */
const acquirePermission = async (
	permissionName: PermissionName,
	trigger: PermissionTrigger,
	{ signal, timeout }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NotSupportedError')
	}

	signal?.throwIfAborted()

	// Browsers that can't query this permission name (Firefox/Safari: `camera`/`microphone`/`midi`)
	// throw a `TypeError` even though the trigger's native API works. Treat that as `'prompt'` so the
	// trigger still surfaces the real dialog; any other query error propagates unchanged.
	let state: PermissionState = 'prompt'
	try {
		state = (await navigator.permissions.query({ name: permissionName })).state
	} catch (error) {
		if (!(error instanceof TypeError)) {
			throw error
		}
	}

	signal?.throwIfAborted()

	if (state === 'granted') {
		return 'granted'
	}
	if (state === 'denied') {
		throw new DOMException('Permission denied', 'NotAllowedError')
	}

	// 'prompt' → fire the trigger to surface the real dialog, bounded by the merged signal/timeout.
	return boundedWait<'granted'>({ signal, timeout }, ({ signal: waitSignal, resolve, reject }) => {
		trigger(waitSignal).then(() => resolve('granted'), reject)
		return () => {} // the trigger holds no listener to detach
	})
}

export default acquirePermission
