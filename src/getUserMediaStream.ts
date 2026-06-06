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
