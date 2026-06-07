import isNavigatorPermissionsSupported from '../isNavigatorPermissionsSupported'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
} from './testUtils'

describe('isNavigatorPermissionsSupported', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('returns false as permissions is not supported', async () => {
			expect(isNavigatorPermissionsSupported()).toBeFalsy()
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => mockPermissionsQuery.mockReset())
		afterAll(teardownPermissionsMock)

		it('returns true as permissions is supported', async () => {
			expect(isNavigatorPermissionsSupported()).toBeTruthy()
		})
	})
})
