import checkPermission from '../checkPermission'
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
				name: 'NOT_SUPPORTED_ERR',
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

		it('throws error', async () => {
			mockPermissionsQuery.mockImplementationOnce(() => {
				throw new Error('ERR')
			})
			await expect(checkPermission('microphone')).rejects.toEqual(new Error('ERR'))
		})
	})
})
