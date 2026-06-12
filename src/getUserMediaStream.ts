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

	if (denied) {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}

	signal?.throwIfAborted()

	const mediaPromise = navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
	if (!signal) return mediaPromise

	// `Promise.race` doesn't cancel the loser: if the signal aborts while `getUserMedia()` is still
	// pending, it may later resolve a stream the caller never sees, leaving the device live. Stop its
	// tracks once it settles, detached so the caller still gets the abort rejection immediately.
	const teardownIfAborted = async () => {
		try {
			const stream = await mediaPromise
			if (signal.aborted) {
				stream.getTracks().forEach((track) => track.stop())
			}
		} catch {
			// Swallow a late rejection so it never surfaces as unhandled once the race has settled.
		}
	}
	void teardownIfAborted()

	let onAbort!: () => void
	const abortPromise = new Promise<never>((_, reject) => {
		onAbort = () => reject(signal.reason)
		signal.addEventListener('abort', onAbort, { once: true })
	})

	return Promise.race([mediaPromise, abortPromise]).finally(() => {
		signal.removeEventListener('abort', onAbort)
	})
}

export default getUserMediaStream
