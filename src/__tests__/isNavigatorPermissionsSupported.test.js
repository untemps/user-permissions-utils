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
		const mockPermissionsQuery = jest.fn()

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
