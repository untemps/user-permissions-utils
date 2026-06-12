import watchPermission from '../watchPermission'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
} from './testUtils'

describe('watchPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('rejects promise', async () => {
			await expect(watchPermission('microphone', vi.fn())).rejects.toMatchObject({
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

		it('queries the requested permission name', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await watchPermission('camera', vi.fn())
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' })
		})

		it('emits the current state immediately by default', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const onChange = vi.fn()
			await watchPermission('microphone', onChange)

			expect(onChange).toHaveBeenCalledTimes(1)
			expect(onChange).toHaveBeenCalledWith('prompt')
		})

		it('does not emit upfront when emitImmediately is false', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const onChange = vi.fn()
			await watchPermission('microphone', onChange, { emitImmediately: false })

			expect(onChange).not.toHaveBeenCalled()
		})

		it('invokes the callback with the new state on every change', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const onChange = vi.fn()
			await watchPermission('microphone', onChange, { emitImmediately: false })

			status.state = 'granted'
			status.dispatchEvent(new Event('change'))
			expect(onChange).toHaveBeenNthCalledWith(1, 'granted')

			status.state = 'denied'
			status.dispatchEvent(new Event('change'))
			expect(onChange).toHaveBeenNthCalledWith(2, 'denied')
		})

		it('subscribes before the upfront emit so no transition is missed', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			const addEventListenerSpy = vi.spyOn(status, 'addEventListener')
			mockPermissionsQuery.mockResolvedValueOnce(status)

			const onChange = vi.fn(() => {
				// The change listener is already registered by the time the upfront emit fires.
				expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
			})
			await watchPermission('microphone', onChange)
			expect(onChange).toHaveBeenCalledTimes(1)
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(watchPermission('microphone', vi.fn())).rejects.toEqual(new Error('ERR'))
		})

		describe('when the upfront emit throws', () => {
			it('removes the change listener before rejecting so no subscription is left behind', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const error = new Error('boom')
				const onChange = vi.fn(() => {
					throw error
				})

				await expect(watchPermission('microphone', onChange)).rejects.toBe(error)
				expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

				// A later change must not reach the now-removed listener
				onChange.mockReset()
				status.state = 'granted'
				status.dispatchEvent(new Event('change'))
				expect(onChange).not.toHaveBeenCalled()
			})

			it('removes the abort listener too so a later abort triggers no further teardown', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const onChange = vi.fn(() => {
					throw new Error('boom')
				})

				await expect(watchPermission('microphone', onChange, { signal: controller.signal })).rejects.toThrow(
					'boom'
				)

				// Teardown ran exactly once (the upfront-throw path), removing the change listener
				expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)

				// Aborting afterwards must not fire the abort handler again (it was unsubscribed)
				controller.abort()
				expect(removeEventListenerSpy).toHaveBeenCalledTimes(1)
			})
		})

		describe('AbortSignal', () => {
			it('rejects immediately when signal is already aborted and never queries', async () => {
				const controller = new AbortController()
				controller.abort()

				await expect(
					watchPermission('microphone', vi.fn(), { signal: controller.signal })
				).rejects.toMatchObject({
					name: 'AbortError',
				})
				expect(mockPermissionsQuery).not.toHaveBeenCalled()
			})

			it('rejects with custom reason when already aborted with reason', async () => {
				const controller = new AbortController()
				const reason = new DOMException('Custom reason', 'AbortError')
				controller.abort(reason)

				await expect(watchPermission('microphone', vi.fn(), { signal: controller.signal })).rejects.toBe(reason)
			})

			it('rejects and never subscribes when aborted during query resolution', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const addEventListenerSpy = vi.spyOn(status, 'addEventListener')
				// Abort synchronously inside the mock so the signal is aborted when await resolves
				mockPermissionsQuery.mockImplementationOnce(() => {
					controller.abort()
					return Promise.resolve(status)
				})

				await expect(
					watchPermission('microphone', vi.fn(), { signal: controller.signal })
				).rejects.toMatchObject({
					name: 'AbortError',
				})
				expect(addEventListenerSpy).not.toHaveBeenCalled()
			})

			it('stops invoking the callback and removes the listener once aborted', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				const removeEventListenerSpy = vi.spyOn(status, 'removeEventListener')
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const onChange = vi.fn()
				await watchPermission('microphone', onChange, { signal: controller.signal, emitImmediately: false })

				status.state = 'granted'
				status.dispatchEvent(new Event('change'))
				expect(onChange).toHaveBeenCalledTimes(1)

				controller.abort()
				expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

				// A later change after abort must not reach the callback
				status.state = 'denied'
				status.dispatchEvent(new Event('change'))
				expect(onChange).toHaveBeenCalledTimes(1)
			})
		})
	})
})
