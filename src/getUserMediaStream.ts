import acquireMediaStream from './_acquireMediaStream'

export interface GetUserMediaStreamOptions {
	signal?: AbortSignal
}

/**
 * Returns a promise resolved when the permission is granted by the user and the stream is retrieved
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param mediaStreamConstraints    Constraints object. @see https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
 * @param options                   Optional settings
 * @param options.signal            Optional AbortSignal to cancel the operation
 */
const getUserMediaStream = async (
	permissionName: PermissionName,
	mediaStreamConstraints: MediaStreamConstraints,
	{ signal }: GetUserMediaStreamOptions = {}
): Promise<MediaStream> => {
	if (!navigator.permissions || !navigator.mediaDevices) {
		throw new DOMException(
			'Navigator API: permissions or Navigator API: mediaDevices not supported',
			'NOT_SUPPORTED_ERR'
		)
	}

	signal?.throwIfAborted()

	// `query()` only lets us short-circuit a prior denial. Browsers that support the device but not
	// querying its permission name (Firefox/Safari: `camera`/`microphone`) throw a `TypeError` here —
	// fall through to `getUserMedia`, the real authority, which surfaces the prompt or rejects on its
	// own. Any other query error propagates unchanged.
	let denied = false
	try {
		denied = (await navigator.permissions.query({ name: permissionName })).state === 'denied'
	} catch (error) {
		if (!(error instanceof TypeError)) {
			throw error
		}
	}

	// Give the abort precedence over the denied short-circuit, matching `getPermission` /
	// `acquirePermission`: an abort that lands while the query settles rejects with `AbortError`,
	// not `NOT_ALLOWED_ERR`.
	signal?.throwIfAborted()

	if (denied) {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}

	// The `getUserMedia` call (and its abort teardown) lives in `acquireMediaStream`, which the
	// camera/microphone triggers reuse directly so the active getters never re-query the permission.
	return acquireMediaStream(mediaStreamConstraints, signal)
}

export default getUserMediaStream
