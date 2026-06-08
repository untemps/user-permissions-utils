import getUserMediaStream from '../getUserMediaStream'
import {
	flushMicrotasks,
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	setupMediaDevicesMock,
	teardownMediaDevicesMock,
	type MockPermissionStatus,
} from './testUtils'

const FAKE_STREAM = {} as MediaStream

describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

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
			beforeAll(() => setNavigatorApiUnsupported('mediaDevices'))
			afterAll(() => restoreNavigatorApi('mediaDevices'))

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

				it('stops the tracks of a stream that resolves after the abort', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)

					// A faithful stream mock whose track exposes a `stop` spy — the plain
					// `FAKE_STREAM` used elsewhere has no `getTracks()`, so it cannot witness the leak.
					const stop = vi.fn()
					const lateStream = {
						getTracks: () => [{ stop } as unknown as MediaStreamTrack],
					} as unknown as MediaStream
					let resolveStream!: (stream: MediaStream) => void
					mockMediaDevicesGetUserMedia.mockImplementationOnce(
						() =>
							new Promise<MediaStream>((resolve) => {
								resolveStream = resolve
							})
					)

					const promise = getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					await flushMicrotasks()
					controller.abort()

					await expect(promise).rejects.toMatchObject({ name: 'AbortError' })

					// `getUserMedia()` resolves *after* the abort: the orphaned stream must be torn down.
					// Observe the teardown across a macrotask boundary — the guard runs on a microtask off
					// `mediaPromise`, and a single microtask tick proved timing-fragile here.
					resolveStream(lateStream)
					await new Promise<void>((resolve) => setTimeout(resolve, 0))

					expect(stop).toHaveBeenCalledOnce()
				})

				it('does not raise an unhandled rejection when getUserMedia rejects after the abort', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)

					let rejectStream!: (reason: unknown) => void
					mockMediaDevicesGetUserMedia.mockImplementationOnce(
						() =>
							new Promise<MediaStream>((_, reject) => {
								rejectStream = reject
							})
					)

					// `process` is a Node global absent from the DOM-only typings, reached via `globalThis`.
					const proc = (
						globalThis as unknown as {
							process: {
								on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
								off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
							}
						}
					).process
					const onUnhandled = vi.fn()
					proc.on('unhandledRejection', onUnhandled)
					try {
						const promise = getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
						await flushMicrotasks()
						controller.abort()

						await expect(promise).rejects.toMatchObject({ name: 'AbortError' })

						// `getUserMedia()` rejects *after* the race already settled. `Promise.race` itself
						// consumes `mediaPromise`'s rejection, so this specifically guards the guard chain's
						// own `.catch(() => {})` sink (complementary to the track-stop test above, which guards
						// the teardown body): without `.catch`, `mediaPromise.then(...)` leaks an unhandled rejection.
						rejectStream(new DOMException('Permission denied', 'NOT_ALLOWED_ERR'))
						await new Promise<void>((resolve) => setTimeout(resolve, 0))

						expect(onUnhandled).not.toHaveBeenCalled()
					} finally {
						proc.off('unhandledRejection', onUnhandled)
					}
				})
			})
		})
	})
})
