import getUserMediaStream from '../getUserMediaStream'

describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('rejects promise', async () => {
			await expect(getUserMediaStream()).rejects.toMatchObject({
				message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
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

		describe('navigator.mediaDevices is not implemented', () => {
			beforeAll(() => {
				global.navigator.mediaDevices = undefined
			})

			it('rejects promise', async () => {
				const status = new PermissionStatus()
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				await expect(getUserMediaStream()).rejects.toMatchObject({
					message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
					name: 'NOT_SUPPORTED_ERR',
				})
			})
		})

		describe('navigator.mediaDevices is implemented', () => {
			const mockMediaDevicesGetUserMedia = vi.fn()

			beforeAll(() => {
				global.MediaDevices = vi.fn(function () {
					return { getUserMedia: mockMediaDevicesGetUserMedia }
				})
				global.navigator.mediaDevices = new MediaDevices()
			})

			beforeEach(() => {
				mockMediaDevicesGetUserMedia.mockReset()
			})

			afterAll(() => {
				global.MediaDevices.mockReset()
			})

			it('rejects promise since user has previously denied permissions', async () => {
				const status = new PermissionStatus()
				status.state = 'denied'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				await expect(getUserMediaStream()).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NOT_ALLOWED_ERR',
				})
			})

			it('resolves promise with stream since user has previously granted permission', async () => {
				const status = new PermissionStatus()
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				await expect(getUserMediaStream()).resolves.toBe('foo')
			})

			it('rejects promise since user has been prompted and has denied permissions', async () => {
				const status = new PermissionStatus()
				status.state = 'prompt'
				status.addEventListener = vi.fn((e, cb) => {
					cb({ target: { state: 'denied' } })
				})
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				await expect(getUserMediaStream()).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NOT_ALLOWED_ERR',
				})
			})

			it('resolves promise with stream since user has been prompted and has granted permissions', async () => {
				const status = new PermissionStatus()
				status.state = 'prompt'
				status.addEventListener = vi.fn((e, cb) => {
					cb({ target: { state: 'granted' } })
				})
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				await expect(getUserMediaStream()).resolves.toBe('foo')
			})

			it('throws since error is raised from permissions', async () => {
				mockPermissionsQuery.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				await expect(getUserMediaStream()).rejects.toEqual(new Error('ERR'))
			})

			it('throws since error is raised from mediaDevices', async () => {
				const status = new PermissionStatus()
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				await expect(getUserMediaStream()).rejects.toEqual(new Error('ERR'))
			})
		})
	})
})
