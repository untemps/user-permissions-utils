import isNavigatorMediaDevicesSupported from '../isNavigatorMediaDevicesSupported'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	setupMediaDevicesMock,
	teardownPermissionsAndMediaDevicesMock,
} from './testUtils'

describe('isNavigatorMediaDevicesSupported', () => {
	describe('navigator.mediaDevices is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('mediaDevices'))
		afterAll(() => restoreNavigatorApi('mediaDevices'))

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorMediaDevicesSupported()).toBeFalsy()
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()
		const mockMediaDevicesGetUserMedia = vi.fn()

		beforeAll(() => {
			setupPermissionsMock(mockPermissionsQuery)
			setupMediaDevicesMock(mockMediaDevicesGetUserMedia)
		})
		beforeEach(() => {
			mockPermissionsQuery.mockReset()
			mockMediaDevicesGetUserMedia.mockReset()
		})
		afterAll(teardownPermissionsAndMediaDevicesMock)

		it('returns true as mediaDevices is supported', async () => {
			expect(isNavigatorMediaDevicesSupported()).toBeTruthy()
		})
	})
})
