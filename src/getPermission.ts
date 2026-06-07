import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'

export interface GetPermissionOptions {
	signal?: AbortSignal
	timeout?: number
}

/**
 * Watches the current state of a permission and resolves once it is `'granted'`.
 *
 * This is a **passive** watcher: it reads the state through `navigator.permissions.query()`,
 * which never displays a permission dialog. When the state is `'prompt'`, it waits for the
 * `change` event — which only fires when something else (e.g. `getUserMediaStream`,
 * `geolocation.getCurrentPosition`) triggers the real request and the user responds.
 *
 * Because nothing transitions a `'prompt'` state on its own, the wait must be bounded: pass a
 * `signal`, a `timeout`, or both. If neither is provided while the state is `'prompt'`, the
 * promise rejects immediately with an `InvalidStateError` instead of hanging forever.
 *
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param options                   Optional settings
 * @param options.signal            Optional AbortSignal to cancel the pending wait (rejects with the signal reason)
 * @param options.timeout           Optional timeout in milliseconds; rejects with a `TimeoutError` once elapsed
 * @returns A promise resolved with `'granted'`
 * @throws {DOMException} `NOT_SUPPORTED_ERR` when the Permissions API is unavailable
 * @throws {DOMException} `NOT_ALLOWED_ERR` when the permission is (or becomes) `'denied'`
 * @throws {DOMException} `InvalidStateError` when the state is `'prompt'` and neither `signal` nor `timeout` is provided
 * @throws {DOMException} `TimeoutError` when `timeout` elapses before the permission is granted
 */
const getPermission = async (
	permissionName: PermissionName,
	{ signal, timeout }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!isNavigatorPermissionsSupported()) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	signal?.throwIfAborted()

	if (permissionStatus.state === 'prompt') {
		if (!signal && timeout === undefined) {
			throw new DOMException(
				'Permission is in "prompt" state and would never settle: navigator.permissions does not display a dialog. Provide a `signal` and/or `timeout` to bound the wait, or trigger the prompt (e.g. via getUserMediaStream).',
				'InvalidStateError'
			)
		}

		return new Promise<'granted'>((resolve, reject) => {
			let timeoutId: ReturnType<typeof setTimeout> | undefined

			const cleanup = () => {
				permissionStatus.removeEventListener('change', onChange)
				signal?.removeEventListener('abort', onAbort)
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId)
				}
			}

			const onChange = (event: Event) => {
				cleanup()
				try {
					resolve(resolveOrRejectBasedOnState((event.target as PermissionStatus).state))
				} catch (error) {
					reject(error)
				}
			}

			const onAbort = () => {
				cleanup()
				reject(signal!.reason)
			}

			if (timeout !== undefined) {
				timeoutId = setTimeout(() => {
					cleanup()
					reject(new DOMException(`Permission request timed out after ${timeout}ms`, 'TimeoutError'))
				}, timeout)
			}

			permissionStatus.addEventListener('change', onChange)
			signal?.addEventListener('abort', onAbort, { once: true })
		})
	}

	return resolveOrRejectBasedOnState(permissionStatus.state)
}

const resolveOrRejectBasedOnState = (state: PermissionState): 'granted' => {
	if (state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}
	return state as 'granted'
}

export default getPermission
