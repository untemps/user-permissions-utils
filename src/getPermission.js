import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'

/**
 * Returns a promise resolved when the permission is granted by the user
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @returns {Promise}
 */
export default async (permissionName) => {
	if (!isNavigatorPermissionsSupported()) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	if (permissionStatus.state === 'prompt') {
		return new Promise((resolve, reject) => {
			const onChange = (event) => {
				permissionStatus.removeEventListener('change', onChange)
				try {
					resolve(resolveOrRejectBasedOnState(event.target.state))
				} catch (error) {
					reject(error)
				}
			}
			permissionStatus.addEventListener('change', onChange)
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
