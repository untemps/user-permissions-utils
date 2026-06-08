import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'
import isNavigatorMediaDevicesSupported from './isNavigatorMediaDevicesSupported'

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
	if (!isNavigatorPermissionsSupported() || !isNavigatorMediaDevicesSupported()) {
		throw new DOMException(
			'Navigator API: permissions or Navigator API: mediaDevices not supported',
			'NOT_SUPPORTED_ERR'
		)
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	if (permissionStatus.state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}

	signal?.throwIfAborted()

	const mediaPromise = navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
	if (!signal) return mediaPromise

	// `getUserMedia()` has no native cancellation and `Promise.race` does not cancel the
	// losing promise: when the signal aborts while `getUserMedia()` is still pending, the race
	// below rejects with `signal.reason` but `mediaPromise` keeps running. Should it later
	// resolve with a live stream, the caller already holds the rejection — and no reference to
	// the stream — so nothing would stop its tracks and the camera/microphone would stay
	// active. Guard the resolution to tear the orphaned stream down. The trailing
	// `.catch(() => {})` also swallows a late rejection so it never surfaces as an unhandled
	// rejection once the race has already settled.
	mediaPromise
		.then((stream) => {
			if (signal.aborted) {
				stream.getTracks().forEach((track) => track.stop())
			}
		})
		.catch(() => {})

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
