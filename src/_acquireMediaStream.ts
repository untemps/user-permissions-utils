/**
 * Calls `navigator.mediaDevices.getUserMedia()` — the part of {@link getUserMediaStream} that runs
 * *after* the permission query. The camera/microphone triggers reuse it directly so they don't
 * re-query a permission `acquirePermission` has already resolved (one `query()` per acquisition).
 *
 * When a `signal` is provided it races `getUserMedia()` against the abort and tears down a stream
 * that resolves *after* the abort, so the device is never left live; without a `signal` it returns
 * the `getUserMedia()` promise directly.
 *
 * @param mediaStreamConstraints    Constraints object. @see https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
 * @param signal                    Optional AbortSignal to cancel the acquisition
 * @throws {DOMException} `NotSupportedError` when `navigator.mediaDevices` is unavailable
 */
const acquireMediaStream = async (
	mediaStreamConstraints: MediaStreamConstraints,
	signal?: AbortSignal
): Promise<MediaStream> => {
	if (!navigator.mediaDevices) {
		throw new DOMException('Navigator API: mediaDevices not supported', 'NotSupportedError')
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

export default acquireMediaStream
