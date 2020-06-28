/**
 * Returns a promise resolved when the permission is granted by the user
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @returns {Promise}
 */
export default async (permissionName) => {
	return new Promise(async (resolve, reject) => {
		if (!navigator.permissions) {
			reject(new DOMException('Permissions not supported', 'NOT_FOUND_ERR'))
		} else {
			try {
				const permissionStatus = await navigator.permissions.query({ name: permissionName })
				const onChange = (event) => {
					permissionStatus.removeEventListener('change', onChange)
					resolveOrRejectBasedOnState(event.target.state, resolve, reject)
				}
				permissionStatus.addEventListener('change', onChange)
				resolveOrRejectBasedOnState(permissionStatus.state, resolve, reject)
			} catch (error) {
				reject(error)
			}
		}
	})
}

const resolveOrRejectBasedOnState = (state, resolve, reject) => {
	switch (state) {
		case 'denied':
			reject(new DOMException('Permission denied', 'NOT_ALLOWED_ERR'))
			break
		default:
			resolve(state)
	}
}
