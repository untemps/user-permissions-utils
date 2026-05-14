import getPermission from '../getPermission'

describe('getPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('rejects promise', async () => {
			await expect(getPermission()).rejects.toMatchObject({
				message: 'Navigator API: permissions not supported',
				name: 'NOT_SUPPORTED_ERR',
			})
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

		it('rejects promise since user has previously denied permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'denied'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission()).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NOT_ALLOWED_ERR',
			})
		})

		it('resolves promise since user has previously granted permission', async () => {
			const status = new PermissionStatus()
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission()).resolves.toBe('granted')
		})

		it('rejects promise since user has been prompted and has denied permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'prompt'
			status.addEventListener = vi.fn((e, cb) => {
				cb({ target: { state: 'denied' } })
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission()).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NOT_ALLOWED_ERR',
			})
		})

		it('resolves promise since user has been prompted and has granted permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'prompt'
			status.addEventListener = vi.fn((e, cb) => {
				cb({ target: { state: 'granted' } })
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission()).resolves.toBe('granted')
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(getPermission()).rejects.toEqual(new Error('ERR'))
		})
	})
})
