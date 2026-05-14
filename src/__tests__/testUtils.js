export const flushMicrotasks = () => Promise.resolve()

export const setupPermissionsMock = (mockQuery) => {
	global.PermissionStatus = vi.fn(function () {
		return { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() }
	})
	global.Permissions = vi.fn(function () {
		return { query: mockQuery }
	})
	global.navigator.permissions = new Permissions()
}

export const teardownPermissionsMock = () => {
	global.PermissionStatus = undefined
	global.Permissions = undefined
	global.navigator.permissions = undefined
}

export const setupMediaDevicesMock = (mockGetUserMedia) => {
	global.MediaDevices = vi.fn(function () {
		return { getUserMedia: mockGetUserMedia }
	})
	global.navigator.mediaDevices = new MediaDevices()
}

export const teardownMediaDevicesMock = () => {
	global.MediaDevices = undefined
	global.navigator.mediaDevices = undefined
}

export const teardownPermissionsAndMediaDevicesMock = () => {
	teardownPermissionsMock()
	teardownMediaDevicesMock()
}
