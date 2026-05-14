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
	global.PermissionStatus.mockReset()
	global.Permissions.mockReset()
}

export const setupMediaDevicesMock = (mockGetUserMedia) => {
	global.MediaDevices = vi.fn(function () {
		return { getUserMedia: mockGetUserMedia }
	})
	global.navigator.mediaDevices = new MediaDevices()
}

export const teardownMediaDevicesMock = () => {
	global.MediaDevices.mockReset()
}
