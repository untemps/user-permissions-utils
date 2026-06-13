import boundedWait from './_boundedWait'

export interface GetPermissionOptions {
	signal?: AbortSignal
	timeout?: number
}

// The DOM `PermissionDescriptor` only declares `name`, but some permissions need extra members to be
// queryable — notably `push`, which Chromium rejects unless `userVisibleOnly: true` is supplied
// (silent push is not allowed). Widening the descriptor lets a dedicated getter pass those members
// through, mirroring how the active primitive `acquirePermission` receives a permission-specific
// `trigger`: the name-specific knowledge stays in the getter, the primitive stays generic.
export interface PermissionQueryDescriptor extends PermissionDescriptor {
	userVisibleOnly?: boolean
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
 * @param permission         Permission name, or a full descriptor for permissions that need extra
 *                           query members (e.g. `{ name: 'push', userVisibleOnly: true }`)
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError`
 * @returns A promise resolved with `'granted'`
 * @throws {DOMException} `NotSupportedError` (API absent or name non-queryable), `NotAllowedError` (denied), `InvalidStateError` or `TimeoutError`
 */
const getPermission = async (
	permission: PermissionName | PermissionQueryDescriptor,
	{ signal, timeout }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NotSupportedError')
	}

	signal?.throwIfAborted()

	const descriptor = typeof permission === 'string' ? { name: permission } : permission

	let permissionStatus: PermissionStatus
	try {
		permissionStatus = await navigator.permissions.query(descriptor)
	} catch (error) {
		// A passive watcher has no native trigger to fall through to (unlike `acquirePermission` /
		// `getUserMediaStream`, which retry via `getUserMedia` / `requestMIDIAccess`). When the browser
		// can't query the name — a non-queryable descriptor (Firefox/Safari) or `push` rejected for
		// lacking `userVisibleOnly` — it throws a `TypeError`. Normalize it to a `DOMException` so the
		// library never leaks a raw `TypeError`, honoring the contract that every entry point throws a
		// `DOMException`. Any other query error propagates unchanged.
		if (error instanceof TypeError) {
			throw new DOMException(`Permission "${descriptor.name}" cannot be queried`, 'NotSupportedError')
		}
		throw error
	}

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
		throw new DOMException('Permission denied', 'NotAllowedError')
	}
	return state
}

export default getPermission
