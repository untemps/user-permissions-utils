import getPermission from '../getPermission'
import {
	flushMicrotasks,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
	type StatusChangeListener,
} from './testUtils'

describe('getPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => {
			;(globalThis.navigator as { permissions?: Permissions }).permissions = undefined
		})

		it('rejects promise', async () => {
			await expect(getPermission('microphone')).rejects.toMatchObject({
				message: 'Navigator API: permissions not supported',
				name: 'NOT_SUPPORTED_ERR',
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
				name: 'NOT_ALLOWED_ERR',
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
			status.addEventListener = vi.fn((_event: string, listener: StatusChangeListener) => {
				listener({ target: { state: 'denied' } })
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission('microphone')).rejects.toMatchObject({
				message: 'Permission denied',
				name: 'NOT_ALLOWED_ERR',
			})
		})

		it('resolves promise since user has been prompted and has granted permissions', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			status.addEventListener = vi.fn((_event: string, listener: StatusChangeListener) => {
				listener({ target: { state: 'granted' } })
			})
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(getPermission('microphone')).resolves.toBe('granted')
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(getPermission('microphone')).rejects.toEqual(new Error('ERR'))
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
				status.addEventListener = vi.fn()
				status.removeEventListener = vi.fn()
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
				status.addEventListener = vi.fn()
				status.removeEventListener = vi.fn()
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
				status.addEventListener = vi.fn((_event: string, listener: StatusChangeListener) => {
					listener({ target: { state: 'granted' } })
				})
				status.removeEventListener = vi.fn()
				mockPermissionsQuery.mockResolvedValueOnce(status)

				await expect(getPermission('microphone', { signal: controller.signal })).resolves.toBe('granted')
				expect(removeAbortSpy).toHaveBeenCalledWith('abort', expect.any(Function))
			})

			it('rejects when signal is aborted while waiting in prompt state', async () => {
				const controller = new AbortController()
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				status.addEventListener = vi.fn()
				status.removeEventListener = vi.fn()
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
				status.addEventListener = vi.fn()
				status.removeEventListener = vi.fn()
				// Abort synchronously inside the mock so signal is aborted when await resolves
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
				const mockRemoveEventListener = vi.fn()
				status.addEventListener = vi.fn()
				status.removeEventListener = mockRemoveEventListener
				mockPermissionsQuery.mockResolvedValueOnce(status)

				const promise = getPermission('microphone', { signal: controller.signal })
				await flushMicrotasks()
				controller.abort()

				await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
				expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
			})
		})
	})
})
