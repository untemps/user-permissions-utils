import isNavigatorMediaDevicesSupported from '../isNavigatorMediaDevicesSupported'

describe('isNavigatorPermissionsSupported', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorMediaDevicesSupported()).toBeFalsy()
		})
	})

	describe('navigator.mediaDevices is not implemented', () => {
		beforeAll(() => {
			global.navigator.mediaDevices = undefined
		})

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorMediaDevicesSupported()).toBeFalsy()
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = jest.fn()
		const mockMediaDevicesGetUserMedia = jest.fn()

		beforeAll(() => {
			global.PermissionStatus = jest.fn(() => ({
				state: 'granted',
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
			}))
			global.Permissions = jest.fn(() => ({
				query: mockPermissionsQuery,
			}))
			global.navigator.permissions = new Permissions()

			global.MediaDevices = jest.fn(() => ({
				getUserMedia: mockMediaDevicesGetUserMedia,
			}))
			global.navigator.mediaDevices = new MediaDevices()
		})

		beforeEach(() => {
			mockPermissionsQuery.mockReset()
			mockMediaDevicesGetUserMedia.mockReset()
		})

		afterAll(() => {
			global.PermissionStatus.mockReset()
			global.Permissions.mockReset()
			global.MediaDevices.mockReset()
		})

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorMediaDevicesSupported()).toBeTruthy()
		})
	})
})
