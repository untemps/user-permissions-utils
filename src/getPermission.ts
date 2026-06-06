import isNavigatorPermissionsSupported from './isNavigatorPermissionsSupported'

export interface GetPermissionOptions {
	signal?: AbortSignal
}

/**
 * Returns a promise resolved when the permission is granted by the user
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 * @param options                   Optional settings
 * @param options.signal            Optional AbortSignal to cancel the pending permission wait
 */
const getPermission = async (
	permissionName: PermissionName,
	{ signal }: GetPermissionOptions = {}
): Promise<'granted'> => {
	if (!isNavigatorPermissionsSupported()) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	signal?.throwIfAborted()

	const permissionStatus = await navigator.permissions.query({ name: permissionName })

	if (permissionStatus.state === 'prompt') {
		return new Promise<'granted'>((resolve, reject) => {
			signal?.throwIfAborted()

			const onChange = (event: Event) => {
				permissionStatus.removeEventListener('change', onChange)
				signal?.removeEventListener('abort', onAbort)
				try {
					resolve(resolveOrRejectBasedOnState((event.target as PermissionStatus).state))
				} catch (error) {
					reject(error)
				}
			}

			const onAbort = () => {
				permissionStatus.removeEventListener('change', onChange)
				reject(signal!.reason)
			}

			permissionStatus.addEventListener('change', onChange)
			signal?.addEventListener('abort', onAbort, { once: true })
		})
	}

	return resolveOrRejectBasedOnState(permissionStatus.state)
}

const resolveOrRejectBasedOnState = (state: PermissionState): 'granted' => {
	if (state === 'denied') {
		throw new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
	}
	return state as 'granted'
}

export default getPermission
