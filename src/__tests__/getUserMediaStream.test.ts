vi.mock('../_acquireMediaStream', () => ({ default: vi.fn() }))

import getUserMediaStream from '../getUserMediaStream'
import acquireMediaStream from '../_acquireMediaStream'
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
const mockAcquireMediaStream = vi.mocked(acquireMediaStream)

const statusOf = (state: PermissionState): MockPermissionStatus => {
	const status = new PermissionStatus() as unknown as MockPermissionStatus
	status.state = state
	return status
}

// `getUserMediaStream` owns the guard + permission query (denied short-circuit, TypeError
// fall-through) and then delegates the actual `getUserMedia` call — including the abort teardown — to
// `acquireMediaStream`, which is mocked here. The stream-acquisition mechanics live in
// `_acquireMediaStream` tests; this suite asserts the query contract and the delegation.
describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		// The Permissions API only powers the best-effort denial short-circuit; its absence (e.g. older
		// Safari) must not block acquisition. `getUserMedia` is the real authority, so we fall through to
		// `acquireMediaStream` without ever querying.
		const mockMediaDevicesGetUserMedia = vi.fn()

		beforeAll(() => {
			setNavigatorApiUnsupported('permissions')
			setupMediaDevicesMock(mockMediaDevicesGetUserMedia)
		})
		afterAll(() => {
			teardownMediaDevicesMock()
			restoreNavigatorApi('permissions')
		})
		beforeEach(() => mockAcquireMediaStream.mockReset())

		it('falls through to acquireMediaStream without querying', async () => {
			mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

			await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
			expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => {
			mockPermissionsQuery.mockReset()
			mockAcquireMediaStream.mockReset()
		})
		afterAll(teardownPermissionsMock)

		describe('navigator.mediaDevices is not implemented', () => {
			beforeAll(() => setNavigatorApiUnsupported('mediaDevices'))
			afterAll(() => restoreNavigatorApi('mediaDevices'))

			it('rejects promise', async () => {
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Navigator API: mediaDevices not supported',
					name: 'NotSupportedError',
				})
			})
		})

		describe('navigator.mediaDevices is implemented', () => {
			const mockMediaDevicesGetUserMedia = vi.fn()

			beforeAll(() => setupMediaDevicesMock(mockMediaDevicesGetUserMedia))
			afterAll(teardownMediaDevicesMock)

			it('rejects promise since user has previously denied permissions', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'denied'
				mockPermissionsQuery.mockResolvedValueOnce(status)

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NotAllowedError',
				})
				// A prior denial short-circuits before any stream acquisition.
				expect(mockAcquireMediaStream).not.toHaveBeenCalled()
			})

			it('delegates to acquireMediaStream when previously granted', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
				expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
			})

			it('delegates to acquireMediaStream on prompt (getUserMedia surfaces the dialog)', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
				expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
			})

			it('propagates a rejection from acquireMediaStream (e.g. a prompt denial)', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					name: 'NotAllowedError',
				})
			})

			it('throws since error is raised from permissions', async () => {
				mockPermissionsQuery.mockImplementationOnce(() => {
					throw new Error('ERR')
				})

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toEqual(new Error('ERR'))
				expect(mockAcquireMediaStream).not.toHaveBeenCalled()
			})

			describe('permission name not queryable (Firefox/Safari)', () => {
				// `query()` throws a `TypeError` for a device the browser supports through `getUserMedia`
				// but won't let you query (Firefox: camera/microphone). The call must fall through to the
				// stream acquisition rather than leaking the `TypeError`.
				it.each([
					{
						mode: 'throws synchronously',
						fail: () =>
							mockPermissionsQuery.mockImplementationOnce(() => {
								throw new TypeError("'camera' is not a valid enum value of type PermissionName")
							}),
					},
					{
						mode: 'rejects its promise',
						fail: () =>
							mockPermissionsQuery.mockRejectedValueOnce(
								new TypeError("'camera' is not a valid enum value of type PermissionName")
							),
					},
				])('falls through to acquireMediaStream when query $mode', async ({ fail }) => {
					fail()
					mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

					await expect(getUserMediaStream('camera', { video: true })).resolves.toBe(FAKE_STREAM)
					expect(mockAcquireMediaStream).toHaveBeenCalledWith({ video: true }, undefined)
				})
			})

			describe('AbortSignal', () => {
				it('rejects immediately when signal is already aborted', async () => {
					const controller = new AbortController()
					controller.abort()

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockPermissionsQuery).not.toHaveBeenCalled()
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it("rejects when signal is aborted after permission is 'prompt' but before delegating", async () => {
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
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it('rejects when signal is aborted after permission granted but before delegating', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it("gives the abort precedence over a 'denied' state (AbortError, not NotAllowedError)", async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'denied'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it('forwards the signal to acquireMediaStream', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)
					mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

					await expect(
						getUserMediaStream('camera', { video: true }, { signal: controller.signal })
					).resolves.toBe(FAKE_STREAM)
					expect(mockAcquireMediaStream).toHaveBeenCalledWith({ video: true }, controller.signal)
				})
			})

			describe('timeout', () => {
				it('forwards a merged signal (not the raw caller signal) to acquireMediaStream', async () => {
					mockPermissionsQuery.mockResolvedValueOnce(statusOf('granted'))
					mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

					await expect(getUserMediaStream('camera', { video: true }, { timeout: 1000 })).resolves.toBe(
						FAKE_STREAM
					)
					expect(mockAcquireMediaStream.mock.calls[0][0]).toEqual({ video: true })
					expect(mockAcquireMediaStream.mock.calls[0][1]).toBeInstanceOf(AbortSignal)
				})

				it('rejects with TimeoutError when the timeout elapses before acquisition settles', async () => {
					vi.useFakeTimers()
					try {
						mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
						let forwardedSignal: AbortSignal | undefined
						mockAcquireMediaStream.mockImplementationOnce((_constraints, signal) => {
							forwardedSignal = signal
							return new Promise<MediaStream>(() => {})
						})

						const promise = getUserMediaStream('microphone', { audio: true }, { timeout: 1000 })
						const expectation = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' })
						await vi.advanceTimersByTimeAsync(1000)
						await expectation

						expect(forwardedSignal?.aborted).toBe(true)
					} finally {
						vi.useRealTimers()
					}
				})

				it('clears the timeout when acquisition resolves first', async () => {
					vi.useFakeTimers()
					try {
						mockPermissionsQuery.mockResolvedValueOnce(statusOf('granted'))
						mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

						await expect(getUserMediaStream('camera', { video: true }, { timeout: 1000 })).resolves.toBe(
							FAKE_STREAM
						)
						expect(vi.getTimerCount()).toBe(0)
					} finally {
						vi.useRealTimers()
					}
				})

				it('gives a caller abort precedence over the timeout (AbortError, not TimeoutError)', async () => {
					const controller = new AbortController()
					mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
					let forwardedSignal: AbortSignal | undefined
					mockAcquireMediaStream.mockImplementationOnce((_constraints, signal) => {
						forwardedSignal = signal
						return new Promise<MediaStream>(() => {})
					})

					const promise = getUserMediaStream(
						'microphone',
						{ audio: true },
						{ signal: controller.signal, timeout: 10000 }
					)
					await flushMicrotasks()
					controller.abort()

					await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
					expect(forwardedSignal?.aborted).toBe(true)
				})
			})
		})
	})
})
