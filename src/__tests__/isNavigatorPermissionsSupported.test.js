import isNavigatorPermissionsSupported from '../isNavigatorPermissionsSupported'

describe('isNavigatorPermissionsSupported', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorPermissionsSupported()).toBeFalsy()
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => {
			global.PermissionStatus = vi.fn(function () {
				return { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() }
			})
			global.Permissions = vi.fn(function () {
				return { query: mockPermissionsQuery }
			})
			global.navigator.permissions = new Permissions()
		})

		beforeEach(() => {
			mockPermissionsQuery.mockReset()
		})

		afterAll(() => {
			global.PermissionStatus.mockReset()
			global.Permissions.mockReset()
		})

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorPermissionsSupported()).toBeTruthy()
		})
	})
})
