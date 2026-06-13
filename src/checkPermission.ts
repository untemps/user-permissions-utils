import type { PermissionQueryDescriptor } from './getPermission'

/**
 * Returns a promise resolved with the current permission state without waiting for user interaction
 * Unlike getPermission, it never waits on 'prompt' nor rejects on 'denied' — it resolves with the raw state
 * @param permission            Permission name, or a full descriptor for permissions that need extra query
 *                              members (e.g. `{ name: 'push', userVisibleOnly: true }`). @see https://w3c.github.io/permissions/#enumdef-permissionname
 */
const checkPermission = async (permission: PermissionName | PermissionQueryDescriptor): Promise<PermissionState> => {
	if (!navigator.permissions) {
		throw new DOMException('Navigator API: permissions not supported', 'NotSupportedError')
	}

	const descriptor = typeof permission === 'string' ? { name: permission } : permission

	const { state } = await navigator.permissions.query(descriptor)

	return state
}

export default checkPermission
