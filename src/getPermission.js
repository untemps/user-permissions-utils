import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'

/**
 * Returns a promise resolved when the permission is granted by the user
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param options.signal            Optional AbortSignal to cancel the pending permission wait
 * @returns {Promise}
 */
export default async (permissionName, { signal } = {}) => {
	if (!isNavigatorPermissionsSupported()) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	if (permissionStatus.state === 'prompt') {
		return new Promise((resolve, reject) => {
			signal?.throwIfAborted()

			const onChange = (event) => {
				permissionStatus.removeEventListener('change', onChange)
				signal?.removeEventListener('abort', onAbort)
				try {
					resolve(resolveOrRejectBasedOnState(event.target.state))
				} catch (error) {
					reject(error)
				}
			}

			const onAbort = () => {
				permissionStatus.removeEventListener('change', onChange)
				reject(signal.reason)
			}

			permissionStatus.addEventListener('change', onChange)
			signal?.addEventListener('abort', onAbort, { once: true })
		})
	}

	return resolveOrRejectBasedOnState(permissionStatus.state)
}

const resolveOrRejectBasedOnState = (state) => {
	if (state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}
	return state
}
