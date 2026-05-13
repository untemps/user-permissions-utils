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
		const mockPermissionsQuery = vi.fn()
		const mockMediaDevicesGetUserMedia = vi.fn()

		beforeAll(() => {
			global.PermissionStatus = vi.fn(function () {
				return { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() }
			})
			global.Permissions = vi.fn(function () {
				return { query: mockPermissionsQuery }
			})
			global.navigator.permissions = new Permissions()

			global.MediaDevices = vi.fn(function () {
				return { getUserMedia: mockMediaDevicesGetUserMedia }
			})
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
