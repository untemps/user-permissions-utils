import acquirePermission from '../_acquirePermission'
import {
	flushMicrotasks,
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
} from './testUtils'

const statusOf = (state: PermissionState): MockPermissionStatus => {
	const status = new PermissionStatus() as unknown as MockPermissionStatus
	status.state = state
	return status
}

describe('acquirePermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('rejects with NotSupportedError without firing the trigger', async () => {
			const trigger = vi.fn()
			await expect(acquirePermission('camera', trigger)).rejects.toMatchObject({
				message: 'Navigator API: permissions not supported',
				name: 'NotSupportedError',
			})
			expect(trigger).not.toHaveBeenCalled()
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => mockPermissionsQuery.mockReset())
		afterAll(teardownPermissionsMock)

		it('resolves with "granted" without firing the trigger when already granted', async () => {
			mockPermissionsQuery.mockResolvedValueOnce(statusOf('granted'))
			const trigger = vi.fn()

			await expect(acquirePermission('camera', trigger)).resolves.toBe('granted')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' })
			expect(trigger).not.toHaveBeenCalled()
		})

		it('rejects with NotAllowedError without firing the trigger when already denied', async () => {
			mockPermissionsQuery.mockResolvedValueOnce(statusOf('denied'))
			const trigger = vi.fn()

			await expect(acquirePermission('camera', trigger)).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NotAllowedError',
			})
			expect(trigger).not.toHaveBeenCalled()
		})

		it('fires the trigger on "prompt" and resolves with "granted" when it resolves', async () => {
			mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
			const trigger = vi.fn().mockResolvedValueOnce(undefined)

			await expect(acquirePermission('geolocation', trigger)).resolves.toBe('granted')
			expect(trigger).toHaveBeenCalledOnce()
			// The trigger receives an AbortSignal so it can tear down its own work when cancelled.
			expect(trigger.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
		})

		it('rejects with the trigger error on "prompt" when it rejects', async () => {
			mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
			const trigger = vi.fn().mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

			await expect(acquirePermission('geolocation', trigger)).rejects.toMatchObject({
				name: 'NotAllowedError',
			})
		})

		it('propagates an error raised by the query', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})

			await expect(acquirePermission('camera', vi.fn())).rejects.toEqual(new Error('ERR'))
		})

		// `query()` fails for a permission name the browser won't query (Firefox/Safari:
		// camera/microphone/midi) even though the trigger's native API works. Treat it as `'prompt'` so
		// the trigger still surfaces the real dialog instead of leaking the `TypeError`. The browser
		// surfaces this as a *rejected* promise, not a synchronous throw, so cover both shapes.
		it.each([
			{
				mode: 'throws a TypeError synchronously',
				fail: () =>
					mockPermissionsQuery.mockImplementationOnce(() => {
						throw new TypeError("'camera' is not a valid enum value of type PermissionName")
					}),
			},
			{
				mode: 'rejects with a TypeError',
				fail: () =>
					mockPermissionsQuery.mockRejectedValueOnce(
						new TypeError("'camera' is not a valid enum value of type PermissionName")
					),
			},
		])('treats a non-queryable name (query $mode) as "prompt" and fires the trigger', async ({ fail }) => {
			fail()
			const trigger = vi.fn().mockResolvedValueOnce(undefined)

			await expect(acquirePermission('camera', trigger)).resolves.toBe('granted')
			expect(trigger).toHaveBeenCalledOnce()
		})

		describe('AbortSignal', () => {
			it('rejects immediately when the signal is already aborted, before querying', async () => {
				const controller = new AbortController()
				controller.abort()
				const trigger = vi.fn()

				await expect(acquirePermission('camera', trigger, { signal: controller.signal })).rejects.toMatchObject(
					{
						name: 'AbortError',
					}
				)
				expect(mockPermissionsQuery).not.toHaveBeenCalled()
				expect(trigger).not.toHaveBeenCalled()
			})

			it('rejects when aborted during query resolution, before firing the trigger', async () => {
				const controller = new AbortController()
				const trigger = vi.fn()
				mockPermissionsQuery.mockImplementationOnce(() => {
					controller.abort()
					return Promise.resolve(statusOf('prompt'))
				})

				await expect(acquirePermission('camera', trigger, { signal: controller.signal })).rejects.toMatchObject(
					{
						name: 'AbortError',
					}
				)
				expect(trigger).not.toHaveBeenCalled()
			})

			it('aborts the trigger and rejects with the reason when the signal aborts during the wait', async () => {
				const controller = new AbortController()
				const reason = new DOMException('Custom reason', 'AbortError')
				mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
				// A trigger that never settles on its own: only the abort can settle the acquisition.
				let forwardedSignal: AbortSignal | undefined
				const trigger = vi.fn((signal?: AbortSignal) => {
					forwardedSignal = signal
					return new Promise(() => {})
				})

				const promise = acquirePermission('camera', trigger, { signal: controller.signal })
				await flushMicrotasks()
				controller.abort(reason)

				await expect(promise).rejects.toBe(reason)
				// The internal signal forwarded to the trigger is aborted too, so it can tear down.
				expect(forwardedSignal?.aborted).toBe(true)
			})

			it('resolves and detaches the abort listener when granted with a signal provided', async () => {
				const controller = new AbortController()
				const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
				const trigger = vi.fn().mockResolvedValueOnce(undefined)

				await expect(acquirePermission('geolocation', trigger, { signal: controller.signal })).resolves.toBe(
					'granted'
				)
				expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
			})
		})

		describe('timeout', () => {
			it('rejects with TimeoutError when the timeout elapses before the trigger settles', async () => {
				vi.useFakeTimers()
				try {
					mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
					let forwardedSignal: AbortSignal | undefined
					const trigger = vi.fn((signal?: AbortSignal) => {
						forwardedSignal = signal
						return new Promise(() => {})
					})

					const promise = acquirePermission('camera', trigger, { timeout: 1000 })
					const expectation = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' })
					await vi.advanceTimersByTimeAsync(1000)
					await expectation

					// The timeout aborts the internal signal forwarded to the trigger.
					expect(forwardedSignal?.aborted).toBe(true)
				} finally {
					vi.useRealTimers()
				}
			})

			it('clears the timeout when the trigger resolves first', async () => {
				vi.useFakeTimers()
				try {
					mockPermissionsQuery.mockResolvedValueOnce(statusOf('prompt'))
					const trigger = vi.fn().mockResolvedValueOnce(undefined)

					await expect(acquirePermission('geolocation', trigger, { timeout: 1000 })).resolves.toBe('granted')
					// No leaked timer left pending.
					expect(vi.getTimerCount()).toBe(0)
				} finally {
					vi.useRealTimers()
				}
			})
		})
	})
})
