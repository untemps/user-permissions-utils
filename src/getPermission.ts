import boundedWait from './_boundedWait'

export interface GetPermissionOptions {
	signal?: AbortSignal
	timeout?: number
}

// `clipboard-read` / `clipboard-write` are valid at runtime but not (yet) in the DOM
// `PermissionName` union — this narrow assertion satisfies the typed parameter from one place.
export const asPermissionName = (name: string): PermissionName => name as PermissionName

/**
 * Watches a permission and resolves once it is `'granted'`. **Passive**: it reads the state via
 * `navigator.permissions.query()` (which never prompts) and, on `'prompt'`, waits for the `change`
 * event — which only fires once something else (e.g. `getUserMediaStream`) triggers the real request.
 *
 * Since nothing transitions `'prompt'` on its own, the wait must be bounded by `signal` and/or
 * `timeout`; with neither, it rejects immediately with `InvalidStateError` rather than hanging.
 *
 * @param permissionName    Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError`
 * @returns A promise resolved with `'granted'`
 * @throws {DOMException} `NOT_SUPPORTED_ERR`, `NOT_ALLOWED_ERR` (denied), `InvalidStateError` or `TimeoutError`
 */
const getPermission = async (
	permissionName: PermissionName,
	{ signal, timeout }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!navigator.permissions) {
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

		return boundedWait<'granted'>({ signal, timeout }, ({ resolve, reject }) => {
			const onChange = (event: Event) => {
				const state = (event.target as PermissionStatus).state
				// Settle only on a terminal state; ignore events that stay in `'prompt'` so the
				// watcher keeps waiting (still bounded by `signal`/`timeout`).
				if (state === 'prompt') {
					return
				}
				try {
					resolve(resolveOrRejectBasedOnState(state))
				} catch (error) {
					reject(error)
				}
			}

			permissionStatus.addEventListener('change', onChange)
			return () => permissionStatus.removeEventListener('change', onChange)
		})
	}

	return resolveOrRejectBasedOnState(permissionStatus.state)
}

// Terminal states only — `'prompt'` is excluded at the type level. After the `'denied'` throw, TS
// narrows `state` to `'granted'`, so the return needs no cast.
const resolveOrRejectBasedOnState = (state: Exclude<PermissionState, 'prompt'>): 'granted' => {
	if (state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}
	return state
}

export default getPermission
