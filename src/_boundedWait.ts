import type { GetPermissionOptions } from './getPermission'

// Handed to the producer so it can settle the wait — and, for producers that can honour
// cancellation, forward `signal` into their own work (e.g. a getUserMedia stream torn down on abort).
export interface BoundedSettle<T> {
	signal: AbortSignal
	resolve: (value: T) => void
	reject: (reason: unknown) => void
}

/**
 * Runs a wait bounded by an optional `signal` and/or `timeout`, shared by the passive
 * {@link getPermission} (settled by the `change` event) and active {@link acquirePermission}
 * (settled by a trigger promise).
 *
 * Merges the caller's `signal` and `timeout` into one internal `AbortController`, lets `subscribe`
 * attach its producer, and tears down the timer and every listener on the first settle — producer,
 * caller abort (reason preserved), or timeout (`TimeoutError`). `subscribe` returns a teardown for
 * whatever it attached; a synchronous settle or throw is handled defensively.
 *
 * @param options.signal    Optional AbortSignal to cancel the wait (rejects with its reason)
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError`
 * @param subscribe         Attaches the producer; returns a teardown invoked on settle
 * @returns A promise settled by the producer, the caller abort, or the timeout
 */
const boundedWait = <T>(
	{ signal, timeout }: GetPermissionOptions,
	subscribe: (settle: BoundedSettle<T>) => () => void
): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const controller = new AbortController()
		let timeoutId: ReturnType<typeof setTimeout> | undefined
		let settled = false
		let teardown: () => void = () => {}

		const cleanup = () => {
			settled = true
			signal?.removeEventListener('abort', onCallerAbort)
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId)
			}
			teardown()
		}

		const onCallerAbort = () => controller.abort(signal!.reason)
		const onAbort = () => {
			cleanup()
			reject(controller.signal.reason)
		}

		if (timeout !== undefined) {
			timeoutId = setTimeout(() => {
				controller.abort(new DOMException(`Permission request timed out after ${timeout}ms`, 'TimeoutError'))
			}, timeout)
		}

		signal?.addEventListener('abort', onCallerAbort, { once: true })
		controller.signal.addEventListener('abort', onAbort, { once: true })

		try {
			teardown = subscribe({
				signal: controller.signal,
				resolve: (value) => {
					cleanup()
					resolve(value)
				},
				reject: (reason) => {
					cleanup()
					reject(reason)
				},
			})
		} catch (error) {
			// `subscribe` threw before returning its teardown — clear the timer/listener it would
			// otherwise leak, then reject.
			cleanup()
			reject(error)
			return
		}

		// Synchronous settle: `cleanup` ran before `teardown` was assigned, so tear down here.
		if (settled) {
			teardown()
		}
	})

export default boundedWait
