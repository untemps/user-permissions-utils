import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'
import isNavigatorMediaDevicesSupported from './isNavigatorMediaDevicesSupported'
import getPermission from './getPermission'

/**
 * Returns a promise resolved when the permission is granted by the user and the stream is retrieved
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param mediaStreamConstraints    Constraints object. @see https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
 * @param options.signal            Optional AbortSignal to cancel the operation
 * @returns {Promise}
 */
export default async (permissionName, mediaStreamConstraints, { signal } = {}) => {
	if (!isNavigatorPermissionsSupported() || !isNavigatorMediaDevicesSupported()) {
		throw new DOMException(
			'Navigator API: permissions or Navigator API: mediaDevices not supported',
			'NOT_SUPPORTED_ERR'
		)
	}

	await getPermission(permissionName, { signal })
	signal?.throwIfAborted()
	return navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
}
