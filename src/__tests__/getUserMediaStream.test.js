import getUserMediaStream from '../getUserMediaStream'

describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			global.navigator.permissions = undefined
		})

		it('rejects promise', async () => {
			try {
				await getUserMediaStream()
			} catch (error) {
				expect(error.message).toEqual('MediaDevices not supported')
				expect(error.name).toEqual('NOT_FOUND_ERR')
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

		describe('navigator.mediaDevices is not implemented', () => {
			beforeAll(() => {
				global.navigator.mediaDevices = undefined
			})

			it('rejects promise', async () => {
				const status = new PermissionStatus()
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				try {
					await getUserMediaStream()
				} catch (error) {
					expect(error.message).toEqual('MediaDevices not supported')
					expect(error.name).toEqual('NOT_FOUND_ERR')
				}
			})
		})

		describe('navigator.mediaDevices is implemented', () => {
			const mockMediaDevicesGetUserMedia = jest.fn()

			beforeAll(() => {
				global.MediaDevices = jest.fn(() => ({
					getUserMedia: mockMediaDevicesGetUserMedia,
				}))
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
				try {
					await getUserMediaStream()
				} catch (error) {
					expect(error.message).toEqual('Permission denied')
					expect(error.name).toEqual('NOT_ALLOWED_ERR')
				}
			})

			it('resolves promise with stream since user has previously granted permission', async () => {
				const status = new PermissionStatus()
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				try {
					const stream = await getUserMediaStream()
					expect(stream).toBe('foo')
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
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				try {
					await getUserMediaStream()
				} catch (error) {
					expect(error.message).toEqual('Permission denied')
					expect(error.name).toEqual('NOT_ALLOWED_ERR')
				}
			})

			it('resolves promise with stream since user has been prompted and has granted permissions', async () => {
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
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce('foo')
				try {
					const stream = await getUserMediaStream()
					expect(stream).toBe('foo')
				} catch (error) {
					throw error
				}
			})

			it('throws since error is raised from permissions', async () => {
				mockPermissionsQuery.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				try {
					await getUserMediaStream()
				} catch (error) {
					expect(error).toEqual(new Error('ERR'))
				}
			})

			it('throws since error is raised from mediaDevices', async () => {
				const status = new PermissionStatus()
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				try {
					await getUserMediaStream()
				} catch (error) {
					expect(error).toEqual(new Error('ERR'))
				}
			})
		})
	})
})
