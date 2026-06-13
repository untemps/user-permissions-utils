import getPermission from '../getPermission'
import {
	flushMicrotasks,
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
} from './testUtils'

describe('getPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('rejects promise', async () => {
			await expect(getPermission('microphone')).rejects.toMatchObject({
				message: 'Navigator API: permissions not supported',
				name: 'NotSupportedError',
			})
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => mockPermissionsQuery.mockReset())
		afterAll(teardownPermissionsMock)

		it('rejects promise since user has previously denied permissions', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'denied'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission('microphone')).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NotAllowedError',
			})
		})

		it('resolves promise since user has previously granted permission', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission('microphone')).resolves.toBe('granted')
		})

		it('rejects promise since user has been prompted and has denied permissions', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const promise = getPermission('microphone', { timeout: 1000 })
			const expectation = expect(promise).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NotAllowedError',
			})
			await flushMicrotasks()
			status.state = 'denied'
			status.dispatchEvent(new Event('change'))
			await expectation
		})

		it('resolves promise since user has been prompted and has granted permissions', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const promise = getPermission('microphone', { timeout: 1000 })
			await flushMicrotasks()
			status.state = 'granted'
			status.dispatchEvent(new Event('change'))
			await expect(promise).resolves.toBe('granted')
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(getPermission('microphone')).rejects.toEqual(new Error('ERR'))
		})

		// A browser that can't query a permission name surfaces the failure as a *rejected* promise, not
		// a synchronous throw; cover both so the `await query()` + try/catch is proven against the shape
		// the browser actually produces.
		it.each([
			{
				mode: 'throws synchronously',
				fail: () =>
					mockPermissionsQuery.mockImplementationOnce(() => {
						throw new TypeError("Failed to read the 'userVisibleOnly' property")
					}),
			},
			{
				mode: 'rejects its promise',
				fail: () =>
					mockPermissionsQuery.mockRejectedValueOnce(
						new TypeError("Failed to read the 'userVisibleOnly' property")
					),
			},
		])('normalizes a TypeError from query() ($mode) to a NotSupportedError DOMException', async ({ fail }) => {
			fail()

			const promise = getPermission('push')
			await expect(promise).rejects.toBeInstanceOf(DOMException)
			await expect(promise).rejects.toMatchObject({ name: 'NotSupportedError' })
		})

		it('propagates a non-TypeError query() rejection unchanged', async () => {
			const error = new DOMException('boom', 'SecurityError')
			mockPermissionsQuery.mockRejectedValueOnce(error)
			await expect(getPermission('microphone')).rejects.toBe(error)
		})

		it('forwards a full descriptor (push userVisibleOnly) to query()', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			await expect(getPermission({ name: 'push', userVisibleOnly: true })).resolves.toBe('granted')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'push', userVisibleOnly: true })
		})

		describe('bounded wait (prompt state)', () => {
			it('rejects immediately when state is prompt and neither signal nor timeout is provided', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const addEventListenerSpy = vi.spyOn(status, 'addEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(status)

				await expect(getPermission('microphone')).rejects.toMatchObject({
					name: 'InvalidStateError',
				})
				// It must not start watching when it cannot ever settle
				expect(addEventListenerSpy).not.toHaveBeenCalled()
			})

			it('rejects with TimeoutError when timeout elapses before the permission changes', async () => {
				vi.useFakeTimers()
				try {
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
					mockPermissionsQuery.mockResolvedValueOnce(status)

					const promise = getPermission('microphone', { timeout: 1000 })
					const expectation = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' })
					await vi.advanceTimersByTimeAsync(1000)
					await expectation

					// The change listener must be removed on timeout (no leak)
					expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
				} finally {
					vi.useRealTimers()
				}
			})

			it('clears the timeout when the permission is granted before it elapses', async () => {
				vi.useFakeTimers()
				try {
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					mockPermissionsQuery.mockResolvedValueOnce(status)

					const promise = getPermission('microphone', { timeout: 1000 })
					await flushMicrotasks()
					status.state = 'granted'
					status.dispatchEvent(new Event('change'))
					await expect(promise).resolves.toBe('granted')

					// The scheduled timeout must have been cleared — no leaked timer left pending
					expect(vi.getTimerCount()).toBe(0)
				} finally {
					vi.useRealTimers()
				}
			})

			it('keeps waiting when a change event leaves the state in prompt and only settles on a terminal state', async () => {
				vi.useFakeTimers()
				try {
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
					mockPermissionsQuery.mockResolvedValueOnce(status)

					const promise = getPermission('microphone', { timeout: 1000 })
					await flushMicrotasks()

					// A `change` event that leaves the state in `'prompt'` must not settle the
					// promise (`Promise<'granted'>` must never resolve with `'prompt'`) and must
					// not tear down the still-bounded watch.
					status.dispatchEvent(new Event('change'))
					expect(removeEventListenerSpy).not.toHaveBeenCalled()
					expect(vi.getTimerCount()).toBe(1)

					// A later transition to a terminal state settles it and cleans everything up.
					status.state = 'granted'
					status.dispatchEvent(new Event('change'))
					await expect(promise).resolves.toBe('granted')
					expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
					expect(vi.getTimerCount()).toBe(0)
				} finally {
					vi.useRealTimers()
				}
			})
		})

		describe('AbortSignal', () => {
			it('rejects immediately when signal is already aborted', async () => {
				const controller = new AbortController()
				controller.abort()
				await expect(getPermission('microphone', { signal: controller.signal })).rejects.toMatchObject({
					name: 'AbortError',
				})
			})

			it('rejects with custom reason when signal is already aborted with reason', async () => {
				const controller = new AbortController()
				const reason = new DOMException('Custom reason', 'AbortError')
				controller.abort(reason)
				await expect(getPermission('microphone', { signal: controller.signal })).rejects.toBe(reason)
			})

			it('rejects with custom reason when aborted with reason during query resolution', async () => {
				const controller = new AbortController()
				const reason = new DOMException('Custom reason', 'AbortError')
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockImplementationOnce(() => {
					controller.abort(reason)
					return Promise.resolve(status)
				})
				await expect(getPermission('microphone', { signal: controller.signal })).rejects.toBe(reason)
			})

			it('rejects with custom reason when aborted with reason while waiting in prompt state', async () => {
				const controller = new AbortController()
				const reason = new DOMException('Custom reason', 'AbortError')
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const promise = getPermission('microphone', { signal: controller.signal })
				await flushMicrotasks()
				controller.abort(reason)

				await expect(promise).rejects.toBe(reason)
			})

			it('resolves and cleans up abort listener when permission granted via onChange', async () => {
				const controller = new AbortController()
				const removeAbortSpy = vi.spyOn(controller.signal, 'removeEventListener')
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const promise = getPermission('microphone', { signal: controller.signal })
				await flushMicrotasks()
				status.state = 'granted'
				status.dispatchEvent(new Event('change'))

				await expect(promise).resolves.toBe('granted')
				// The abort listener was genuinely registered (the watch was pending) and is removed
				// on cleanup — only the real async path exercises this ordering.
				expect(removeAbortSpy).toHaveBeenCalledWith('abort', expect.any(Function))
			})

			it('rejects when signal is aborted while waiting in prompt state', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const promise = getPermission('microphone', { signal: controller.signal })
				await flushMicrotasks()
				controller.abort()

				await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
			})

			it('rejects when signal is aborted during query resolution (race condition)', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				// Abort synchronously inside the mock so signal is aborted when await resolves
				mockPermissionsQuery.mockImplementationOnce(() => {
					controller.abort()
					return Promise.resolve(status)
				})

				await expect(getPermission('microphone', { signal: controller.signal })).rejects.toMatchObject({
					name: 'AbortError',
				})
			})

			it('rejects when aborted during query resolution even if the state resolves to granted', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'granted'
				// Abort synchronously inside the mock so the signal is aborted once the query settles
				mockPermissionsQuery.mockImplementationOnce(() => {
					controller.abort()
					return Promise.resolve(status)
				})

				await expect(getPermission('microphone', { signal: controller.signal })).rejects.toMatchObject({
					name: 'AbortError',
				})
			})

			it('cleans up onChange listener when aborted', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const promise = getPermission('microphone', { signal: controller.signal })
				await flushMicrotasks()
				controller.abort()

				await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
				expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
			})
		})
	})
})
