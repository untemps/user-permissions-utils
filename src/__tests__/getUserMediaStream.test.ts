import getUserMediaStream from '../getUserMediaStream'
import {
	flushMicrotasks,
	setupPermissionsMock,
	teardownPermissionsMock,
	setupMediaDevicesMock,
	teardownMediaDevicesMock,
	type MockPermissionStatus,
} from './testUtils'

const FAKE_STREAM = {} as MediaStream

describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			;(globalThis.navigator as { permissions?: Permissions }).permissions = undefined
		})

		it('rejects promise', async () => {
			await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
				message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
				name: 'NOT_SUPPORTED_ERR',
			})
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => mockPermissionsQuery.mockReset())
		afterAll(teardownPermissionsMock)

		describe('navigator.mediaDevices is not implemented', () => {
			beforeAll(() => {
				;(globalThis.navigator as { mediaDevices?: MediaDevices }).mediaDevices = undefined
			})

			it('rejects promise', async () => {
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
					name: 'NOT_SUPPORTED_ERR',
				})
			})
		})

		describe('navigator.mediaDevices is implemented', () => {
			const mockMediaDevicesGetUserMedia = vi.fn()

			beforeAll(() => setupMediaDevicesMock(mockMediaDevicesGetUserMedia))
			beforeEach(() => mockMediaDevicesGetUserMedia.mockReset())
			afterAll(teardownMediaDevicesMock)

			it('rejects promise since user has previously denied permissions', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'denied'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NOT_ALLOWED_ERR',
				})
			})

			it('resolves promise with stream since user has previously granted permission', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)
				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
			})

			it('rejects promise since user has been prompted and has denied permissions', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockRejectedValueOnce(
					new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
				)
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NOT_ALLOWED_ERR',
				})
			})

			it('resolves promise with stream since user has been prompted and has granted permissions', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)
				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
			})

			it('throws since error is raised from permissions', async () => {
				mockPermissionsQuery.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toEqual(new Error('ERR'))
			})

			it('throws since error is raised from mediaDevices', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockMediaDevicesGetUserMedia.mockImplementationOnce(() => {
					throw new Error('ERR')
				})
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toEqual(new Error('ERR'))
			})

			describe('AbortSignal', () => {
				it('rejects immediately when signal is already aborted', async () => {
					const controller = new AbortController()
					controller.abort()
					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({
						name: 'AbortError',
					})
				})

				it("rejects when signal is aborted after permission is 'prompt' but before getUserMedia", async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockMediaDevicesGetUserMedia).not.toHaveBeenCalled()
				})

				it('rejects when signal is aborted after permission granted but before getUserMedia', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({
						name: 'AbortError',
					})
					expect(mockMediaDevicesGetUserMedia).not.toHaveBeenCalled()
				})

				it('rejects when signal is aborted during getUserMedia', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)
					mockMediaDevicesGetUserMedia.mockImplementationOnce(() => new Promise(() => {}))

					const promise = getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					await flushMicrotasks()
					controller.abort()

					await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockMediaDevicesGetUserMedia).toHaveBeenCalledOnce()
				})

				it('resolves with stream when signal is provided but not aborted', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)
					mockMediaDevicesGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).resolves.toBe(FAKE_STREAM)
				})
			})
		})
	})
})
