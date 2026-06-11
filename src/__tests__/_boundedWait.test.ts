import boundedWait from '../_boundedWait'
import { flushMicrotasks } from './testUtils'

// `boundedWait` is a pure async primitive: it never touches `navigator`, only the caller's
// `signal`/`timeout` and the `subscribe` producer. Its real consumers (`getPermission`,
// `acquirePermission`) guard an already-aborted signal *before* entering the wait, so these tests
// exercise future aborts/timeouts and the producer settle paths, not entry-time abort.
describe('boundedWait', () => {
	describe('producer settles the wait', () => {
		it('resolves with the producer value (async settle) and detaches its teardown', async () => {
			const teardown = vi.fn()
			const promise = boundedWait<string>({}, ({ resolve }) => {
				Promise.resolve().then(() => resolve('value'))
				return teardown
			})

			await expect(promise).resolves.toBe('value')
			expect(teardown).toHaveBeenCalledOnce()
		})

		it('resolves and still tears down when the producer settles synchronously', async () => {
			const teardown = vi.fn()
			const promise = boundedWait<string>({}, ({ resolve }) => {
				resolve('value')
				return teardown
			})

			await expect(promise).resolves.toBe('value')
			expect(teardown).toHaveBeenCalledOnce()
		})

		it('rejects with the producer reason', async () => {
			const reason = new DOMException('Permission denied', 'NOT_ALLOWED_ERR')
			const promise = boundedWait<string>({}, ({ reject }) => {
				Promise.resolve().then(() => reject(reason))
				return () => {}
			})

			await expect(promise).rejects.toBe(reason)
		})

		it('hands the producer a non-aborted merged signal when no signal/timeout is provided', async () => {
			let forwarded: AbortSignal | undefined
			const promise = boundedWait<string>({}, ({ signal, resolve }) => {
				forwarded = signal
				resolve('value')
				return () => {}
			})

			await expect(promise).resolves.toBe('value')
			expect(forwarded).toBeInstanceOf(AbortSignal)
			expect(forwarded?.aborted).toBe(false)
		})
	})

	describe('caller signal', () => {
		it('rejects with the caller reason and aborts the forwarded signal when the signal aborts', async () => {
			const controller = new AbortController()
			const reason = new DOMException('Custom reason', 'AbortError')
			const teardown = vi.fn()
			let forwarded: AbortSignal | undefined

			// A producer that never settles on its own: only the abort can settle the wait.
			const promise = boundedWait<string>({ signal: controller.signal }, ({ signal }) => {
				forwarded = signal
				return teardown
			})
			await flushMicrotasks()
			controller.abort(reason)

			await expect(promise).rejects.toBe(reason)
			expect(forwarded?.aborted).toBe(true)
			expect(teardown).toHaveBeenCalledOnce()
		})

		it('detaches the caller abort listener once the producer resolves', async () => {
			const controller = new AbortController()
			const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')

			await expect(
				boundedWait<string>({ signal: controller.signal }, ({ resolve }) => {
					Promise.resolve().then(() => resolve('value'))
					return () => {}
				})
			).resolves.toBe('value')
			expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
		})
	})

	describe('timeout', () => {
		it('rejects with TimeoutError and aborts the forwarded signal when the timeout elapses', async () => {
			vi.useFakeTimers()
			try {
				let forwarded: AbortSignal | undefined
				const promise = boundedWait<string>({ timeout: 1000 }, ({ signal }) => {
					forwarded = signal
					return () => {}
				})
				const expectation = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' })
				await vi.advanceTimersByTimeAsync(1000)
				await expectation

				expect(forwarded?.aborted).toBe(true)
			} finally {
				vi.useRealTimers()
			}
		})

		it('clears the timeout (no leaked timer) when the producer resolves first', async () => {
			vi.useFakeTimers()
			try {
				await expect(
					boundedWait<string>({ timeout: 1000 }, ({ resolve }) => {
						Promise.resolve().then(() => resolve('value'))
						return () => {}
					})
				).resolves.toBe('value')
				expect(vi.getTimerCount()).toBe(0)
			} finally {
				vi.useRealTimers()
			}
		})
	})
})
