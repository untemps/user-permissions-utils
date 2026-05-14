export declare function getPermission(
	permissionName: PermissionName,
	options?: { signal?: AbortSignal }
): Promise<'granted'>
export declare function getUserMediaStream(
	permissionName: PermissionName,
	constraints: MediaStreamConstraints
): Promise<MediaStream>
export declare function isNavigatorPermissionsSupported(): boolean
export declare function isNavigatorMediaDevicesSupported(): boolean
