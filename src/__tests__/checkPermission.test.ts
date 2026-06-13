import checkPermission from '../checkPermission'
import { asPermissionName } from '../getPermission'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
} from './testUtils'

describe('checkPermission', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('rejects promise', async () => {
			await expect(checkPermission('microphone')).rejects.toMatchObject({
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

		it('resolves with "granted" state', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(checkPermission('microphone')).resolves.toBe('granted')
		})

		it('resolves with "denied" state without rejecting', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'denied'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(checkPermission('microphone')).resolves.toBe('denied')
		})

		it('resolves with "prompt" state without waiting', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(checkPermission('microphone')).resolves.toBe('prompt')
		})

		it('queries the requested permission name', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await checkPermission('camera')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' })
		})

		it('forwards a full descriptor (push userVisibleOnly) to query()', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(checkPermission({ name: 'push', userVisibleOnly: true })).resolves.toBe('granted')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'push', userVisibleOnly: true })
		})

		it('queries a clipboard permission name passed as a string', async () => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'prompt'
			mockPermissionsQuery.mockResolvedValueOnce(status)
			await expect(checkPermission(asPermissionName('clipboard-read'))).resolves.toBe('prompt')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'clipboard-read' })
		})

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(checkPermission('microphone')).rejects.toEqual(new Error('ERR'))
		})
	})
})
