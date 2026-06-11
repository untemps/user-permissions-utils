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
 * {@link getPermission} (settled by the Permissions API `change` event) and the active
 * {@link acquirePermission} (settled by a native trigger promise).
 *
 * It owns the whole lifecycle: it merges the caller's `signal` and the optional `timeout` into a
 * single internal `AbortController`, lets `subscribe` attach its producer, and guarantees the timer
 * and every listener are torn down on the **first** settle — whichever fires first (producer,
 * caller abort, or timeout). The caller's abort `reason` is preserved as-is; a timeout rejects with
 * a `TimeoutError` `DOMException`.
 *
 * `subscribe` receives the merged `signal` (to forward to a cancellable producer) plus `resolve` /
 * `reject`, and returns a teardown for whatever it attached (e.g. an event listener). It must not
 * settle synchronously, but the synchronous-settle case is handled defensively all the same.
 *
 * @param options           Optional settings bounding the wait
 * @param options.signal    Optional AbortSignal to cancel the wait (rejects with its reason)
 * @param options.timeout   Optional timeout in milliseconds; rejects with a `TimeoutError` once elapsed
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

		// If `subscribe` settled synchronously, `cleanup` ran before `teardown` was assigned above —
		// so tear down here what it just returned.
		if (settled) {
			teardown()
		}
	})

export default boundedWait
