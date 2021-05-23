import getPermission from '../getPermission'

describe('getPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('rejects promise', async () => {
			try {
				await getPermission()
			} catch (error) {
				expect(error.message).toEqual('Navigator API: permissions not supported')
				expect(error.name).toEqual('NOT_SUPPORTED_ERR')
			}
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

		it('rejects promise since user has previously denied permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'denied'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			try {
				await getPermission()
			} catch (error) {
				expect(error.message).toEqual('Permission denied')
				expect(error.name).toEqual('NOT_ALLOWED_ERR')
			}
		})

		it('resolves promise since user has previously granted permission', async () => {
			const status = new PermissionStatus()
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			try {
				const status = await getPermission()
				expect(status).toBe('granted')
			} catch (error) {
				throw error
			}
		})

		it('rejects promise since user has been prompted and has denied permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'prompt'
			status.addEventListener = jest.fn((e, cb) => {
				const event = {
					target: {
						state: 'denied',
					},
				}
				cb(event)
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			try {
				await getPermission()
			} catch (error) {
				expect(error.message).toEqual('Permission denied')
				expect(error.name).toEqual('NOT_ALLOWED_ERR')
			}
		})

		it('resolves promise since user has been prompted and has granted permissions', async () => {
			const status = new PermissionStatus()
			status.state = 'prompt'
			status.addEventListener = jest.fn((e, cb) => {
				const event = {
					target: {
						state: 'granted',
					},
				}
				cb(event)
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			try {
				const status = await getPermission()
				expect(status).toBe('granted')
			} catch (error) {
				throw error
			}
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			try {
				await getPermission()
			} catch (error) {
				expect(error).toEqual(new Error('ERR'))
			}
		})
	})
})
