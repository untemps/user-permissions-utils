import getPermission from './getPermission'

/**
 * Returns a promise resolved when the media is authorized and the stream is retrieved
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param mediaStreamConstraints    Constraints object. @see https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamConstraints
 * @returns {Promise}
 */
export default async (permissionName, mediaStreamConstraints) => {
	return new Promise(async (resolve, reject) => {
		if (!navigator.mediaDevices) {
			reject(new DOMException('NOT_FOUND_ERR', 'NotFoundError'))
		} else {
			try {
				const [, stream] = await Promise.all([
					await getPermission(permissionName),
					await navigator.mediaDevices.getUserMedia(mediaStreamConstraints),
				])
				resolve(stream)
			} catch (error) {
				reject(error)
			}
		}
	})
}
