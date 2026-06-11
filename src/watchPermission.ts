export interface WatchPermissionOptions {
	signal?: AbortSignal
	emitImmediately?: boolean
}

/**
 * Subscribes to a permission's live state and invokes `onChange` on every transition.
 *
 * Where {@link checkPermission} reads the state once and {@link getPermission} waits a single time
 * for `'granted'`, this is a **continuous observer**: it wraps `navigator.permissions.query()` and
 * its `change` event so consumers never reach for the raw browser API. Like `query()`, it never
 * displays a dialog — it only reports the state as it changes (e.g. once `getUserMediaStream` or a
 * dedicated getter surfaces the real prompt and the user responds).
 *
 * By default it emits the current state immediately (so a single call replaces a `checkPermission`
 * read followed by a manual subscription), then on every `change`. Pass `emitImmediately: false` to
 * receive transitions only.
 *
 * The subscription lives until the optional `signal` aborts, at which point the `change` listener is
 * removed (no leak). Omit the `signal` for a watch that lasts the page's lifetime. Aborting *after*
 * the subscription is active is a silent teardown — the returned promise has already resolved, so it
 * is not rejected; only an abort *before* the subscription is active rejects with `AbortError`.
 *
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param onChange                  Called with the permission state on each transition (and once upfront unless `emitImmediately` is `false`)
 * @param options                   Optional settings
 * @param options.signal            Optional AbortSignal that stops the subscription (removes the `change` listener); aborting before the subscription is active rejects with `AbortError` instead
 * @param options.emitImmediately   When `true` (default), invokes `onChange` with the current state before listening for changes
 * @returns A promise resolved once the subscription is active
 * @throws {DOMException} `NOT_SUPPORTED_ERR` when the Permissions API is unavailable, or `AbortError` when `signal` is already aborted before the subscription is active
 */
const watchPermission = async (
	permissionName: PermissionName,
	onChange: (state: PermissionState) => void,
	{ signal, emitImmediately = true }: WatchPermissionOptions = {}
): Promise<void> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	signal?.throwIfAborted()

	// Register the `change` listener before the upfront emit. There is no async gap between
	// `query()` resolving and this synchronous block, so the browser can't slip a `change` event in
	// regardless of order — subscribing first is defensive, covering only a transition that `onChange`
	// itself might trigger. The abort listener removes the `change` listener on teardown (no leak).
	const listener = () => onChange(permissionStatus.state)
	permissionStatus.addEventListener('change', listener)
	signal?.addEventListener('abort', () => permissionStatus.removeEventListener('change', listener), { once: true })

	if (emitImmediately) {
		onChange(permissionStatus.state)
	}
}

export default watchPermission
