/**
 * Returns a promise resolved with the current permission state without waiting for user interaction
 * Unlike getPermission, it never waits on 'prompt' nor rejects on 'denied' — it resolves with the raw state
 * @param permissionName            Name of the permission. @see https://w3c.github.io/permissions/#enumdef-permissionname
 */
const checkPermission = async (permissionName: PermissionName): Promise<PermissionState> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NOT_SUPPORTED_ERR')
	}

	const { state } = await navigator.permissions.query({ name: permissionName })

	return state
}

export default checkPermission
