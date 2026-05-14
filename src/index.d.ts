export declare function getPermission(
	permissionName: PermissionName,
	options?: { signal?: AbortSignal }
): Promise<'granted'>
export declare function getUserMediaStream(
	permissionName: PermissionName,
	constraints: MediaStreamConstraints,
	options?: { signal?: AbortSignal }
): Promise<MediaStream>
export declare function isNavigatorPermissionsSupported(): boolean
export declare function isNavigatorMediaDevicesSupported(): boolean
