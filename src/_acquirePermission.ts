import type { GetPermissionOptions } from './getPermission'

// A native call that surfaces a permission's real dialog. It must resolve **only** once the
// permission is granted and reject with a `DOMException` otherwise (e.g. `NOT_ALLOWED_ERR` on
// denial/dismissal), so `acquirePermission` can treat every permission identically.
export type PermissionTrigger = (signal?: AbortSignal) => Promise<unknown>

/**
 * Actively acquires a permission: reads the current state through `navigator.permissions.query()`
 * and, when it is `'prompt'`, fires the native `trigger` that surfaces the real browser dialog,
 * resolving with `'granted'` once the user/UA grants it.
 *
 * This generalises {@link getUserMediaStream}'s query-then-trigger pattern to any permission with
 * a native call able to surface its prompt. Unlike the passive {@link getPermission}, it does not
 * need a bounded wait to settle a `'prompt'` state — the trigger itself settles when the user
 * responds. `signal`/`timeout` still stop the wait (the returned promise rejects), and the merged
 * signal is forwarded to the trigger: a trigger that honours it (camera/microphone, via
 * `getUserMediaStream`) tears down the resource it holds rather than leaking it. A trigger that
 * ignores the signal (geolocation, notifications, midi, …) simply stops being awaited — the native
 * prompt it surfaced is not cancellable, so it stays up and a late response is discarded.
 *
 * @param permissionName    Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param trigger           Native call that surfaces the prompt (resolve = granted, reject = not granted)
 * @param options           Optional settings
 * @param options.signal    Optional AbortSignal to cancel the pending acquisition
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError` once elapsed
 * @returns A promise resolved with `'granted'`
 * @throws {DOMException} `NOT_SUPPORTED_ERR` when the Permissions API is unavailable
 * @throws {DOMException} `NOT_ALLOWED_ERR` when the permission is (or becomes) `'denied'`
 * @throws {DOMException} `TimeoutError` when `timeout` elapses before the user responds
 */
const acquirePermission = async (
	permissionName: PermissionName,
	trigger: PermissionTrigger,
	{ signal, timeout }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	signal?.throwIfAborted()

	if (permissionStatus.state === 'granted') {
		return 'granted'
	}
	if (permissionStatus.state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}

	// 'prompt' → surface the real dialog by firing the native trigger. An internal controller
	// merges the caller's `signal` and the optional `timeout` and is forwarded to the trigger: a
	// trigger that honours it (camera/microphone) aborts its own pending work (e.g. stops a
	// getUserMedia stream) when the wait is cancelled; one that ignores it just stops being awaited.
	return new Promise<'granted'>((resolve, reject) => {
		const controller = new AbortController()
		let timeoutId: ReturnType<typeof setTimeout> | undefined

		const cleanup = () => {
			signal?.removeEventListener('abort', onCallerAbort)
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId)
			}
		}

		const onCallerAbort = () => controller.abort(signal!.reason)
		const onAbort = () => {
			cleanup()
			reject(controller.signal.reason)
		}

		if (timeout !== undefined) {
			timeoutId = setTimeout(() => {
				controller.abort(new DOMException(`Permission request timed out after ${timeout}ms`, 'TimeoutError'))
			}, timeout)
		}

		signal?.addEventListener('abort', onCallerAbort, { once: true })
		controller.signal.addEventListener('abort', onAbort, { once: true })

		trigger(controller.signal).then(
			() => {
				cleanup()
				resolve('granted')
			},
			(error) => {
				cleanup()
				reject(error)
			}
		)
	})
}

export default acquirePermission
