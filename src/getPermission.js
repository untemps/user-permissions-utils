/**
 * Returns a promise resolved when the permission is granted by the user
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @returns {Promise}
 */
export default async (permissionName) => {
	return new Promise(async (resolve, reject) => {
		if (!navigator.permissions) {
			reject(new DOMException('NOT_FOUND_ERR', 'NotFoundError'))
		} else {
			try {
				const permissionStatus = await navigator.permissions.query({ name: permissionName })
				switch (permissionStatus.state) {
					case 'denied':
						reject(new DOMException('NOT_ALLOWED_ERR', 'NotAllowedError'))
						break
					case 'prompt':
						const onChange = (event) => {
							permissionStatus.removeEventListener('change', onChange)
							if (event.target.state === 'denied') {
								reject(new DOMException('NOT_ALLOWED_ERR', 'NotAllowedError'))
							} else {
								resolve(event.target.state)
							}
						}
						permissionStatus.addEventListener('change', onChange)
						break
					default:
						resolve(permissionStatus.state)
				}
			} catch (error) {
				reject(error)
			}
		}
	})
}
