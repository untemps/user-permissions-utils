import acquireMediaStream from '../_acquireMediaStream'
import {
	flushMicrotasks,
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupMediaDevicesMock,
	teardownMediaDevicesMock,
} from './testUtils'

const FAKE_STREAM = {} as MediaStream

describe('acquireMediaStream', () => {
	describe('navigator.mediaDevices is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('mediaDevices'))
		afterAll(() => restoreNavigatorApi('mediaDevices'))

		it('rejects with NotSupportedError', async () => {
			await expect(acquireMediaStream({ audio: true })).rejects.toMatchObject({
				message: 'Navigator API: mediaDevices not supported',
				name: 'NotSupportedError',
			})
		})
	})

	describe('navigator.mediaDevices is implemented', () => {
		const mockGetUserMedia = vi.fn()

		beforeAll(() => setupMediaDevicesMock(mockGetUserMedia))
		beforeEach(() => mockGetUserMedia.mockReset())
		afterAll(teardownMediaDevicesMock)

		it('resolves with the stream when no signal is provided', async () => {
			mockGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)

			await expect(acquireMediaStream({ audio: true })).resolves.toBe(FAKE_STREAM)
			expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
		})

		it('propagates an error raised by getUserMedia', async () => {
			mockGetUserMedia.mockImplementationOnce(() => {
				throw new Error('ERR')
			})

			await expect(acquireMediaStream({ audio: true })).rejects.toEqual(new Error('ERR'))
		})

		describe('AbortSignal', () => {
			it('rejects immediately when signal is already aborted', async () => {
				const controller = new AbortController()
				controller.abort()

				await expect(acquireMediaStream({ audio: true }, controller.signal)).rejects.toMatchObject({
					name: 'AbortError',
				})
				expect(mockGetUserMedia).not.toHaveBeenCalled()
			})

			it('resolves with stream when signal is provided but not aborted', async () => {
				const controller = new AbortController()
				mockGetUserMedia.mockResolvedValueOnce(FAKE_STREAM)

				await expect(acquireMediaStream({ audio: true }, controller.signal)).resolves.toBe(FAKE_STREAM)
			})

			it('rejects when signal is aborted during getUserMedia', async () => {
				const controller = new AbortController()
				mockGetUserMedia.mockImplementationOnce(() => new Promise(() => {}))

				const promise = acquireMediaStream({ audio: true }, controller.signal)
				await flushMicrotasks()
				controller.abort()

				await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
				expect(mockGetUserMedia).toHaveBeenCalledOnce()
			})

			it('stops the tracks of a stream that resolves after the abort', async () => {
				const controller = new AbortController()

				// A faithful stream mock whose track exposes a `stop` spy — the plain `FAKE_STREAM` used
				// elsewhere has no `getTracks()`, so it cannot witness the leak.
				const stop = vi.fn()
				const lateStream = {
					getTracks: () => [{ stop } as unknown as MediaStreamTrack],
				} as unknown as MediaStream
				let resolveStream!: (stream: MediaStream) => void
				mockGetUserMedia.mockImplementationOnce(
					() =>
						new Promise<MediaStream>((resolve) => {
							resolveStream = resolve
						})
				)

				const promise = acquireMediaStream({ audio: true }, controller.signal)
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

				let rejectStream!: (reason: unknown) => void
				mockGetUserMedia.mockImplementationOnce(
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
					const promise = acquireMediaStream({ audio: true }, controller.signal)
					await flushMicrotasks()
					controller.abort()

					await expect(promise).rejects.toMatchObject({ name: 'AbortError' })

					// `getUserMedia()` rejects *after* the race already settled. `Promise.race` itself
					// consumes `mediaPromise`'s rejection, so this specifically guards the teardown's own
					// `catch` sink: without it, `await mediaPromise` would rethrow and leak an unhandled
					// rejection.
					rejectStream(new DOMException('Permission denied', 'NotAllowedError'))
					await new Promise<void>((resolve) => setTimeout(resolve, 0))

					expect(onUnhandled).not.toHaveBeenCalled()
				} finally {
					proc.off('unhandledRejection', onUnhandled)
				}
			})
		})
	})
})
