vi.mock('../_acquireMediaStream', () => ({ default: vi.fn() }))

import getUserMediaStream from '../getUserMediaStream'
import acquireMediaStream from '../_acquireMediaStream'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	setupMediaDevicesMock,
	teardownMediaDevicesMock,
	type MockPermissionStatus,
} from './testUtils'

const FAKE_STREAM = {} as MediaStream
const mockAcquireMediaStream = vi.mocked(acquireMediaStream)

// `getUserMediaStream` owns the guard + permission query (denied short-circuit, TypeError
// fall-through) and then delegates the actual `getUserMedia` call — including the abort teardown — to
// `acquireMediaStream`, which is mocked here. The stream-acquisition mechanics live in
// `_acquireMediaStream` tests; this suite asserts the query contract and the delegation.
describe('getUserMediaStream', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it('rejects promise', async () => {
			await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
				message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
				name: 'NOT_SUPPORTED_ERR',
			})
		})
	})

	describe('navigator.permissions is implemented', () => {
		const mockPermissionsQuery = vi.fn()

		beforeAll(() => setupPermissionsMock(mockPermissionsQuery))
		beforeEach(() => {
			mockPermissionsQuery.mockReset()
			mockAcquireMediaStream.mockReset()
		})
		afterAll(teardownPermissionsMock)

		describe('navigator.mediaDevices is not implemented', () => {
			beforeAll(() => setNavigatorApiUnsupported('mediaDevices'))
			afterAll(() => restoreNavigatorApi('mediaDevices'))

			it('rejects promise', async () => {
				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Navigator API: permissions or Navigator API: mediaDevices not supported',
					name: 'NOT_SUPPORTED_ERR',
				})
			})
		})

		describe('navigator.mediaDevices is implemented', () => {
			const mockMediaDevicesGetUserMedia = vi.fn()

			beforeAll(() => setupMediaDevicesMock(mockMediaDevicesGetUserMedia))
			afterAll(teardownMediaDevicesMock)

			it('rejects promise since user has previously denied permissions', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'denied'
				mockPermissionsQuery.mockResolvedValueOnce(status)

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					message: 'Permission denied',
					name: 'NOT_ALLOWED_ERR',
				})
				// A prior denial short-circuits before any stream acquisition.
				expect(mockAcquireMediaStream).not.toHaveBeenCalled()
			})

			it('delegates to acquireMediaStream when previously granted', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'granted'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
				expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
			})

			it('delegates to acquireMediaStream on prompt (getUserMedia surfaces the dialog)', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

				await expect(getUserMediaStream('microphone', { audio: true })).resolves.toBe(FAKE_STREAM)
				expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
			})

			it('propagates a rejection from acquireMediaStream (e.g. a prompt denial)', async () => {
				const status = new PermissionStatus() as unknown as MockPermissionStatus
				status.state = 'prompt'
				mockPermissionsQuery.mockResolvedValueOnce(status)
				mockAcquireMediaStream.mockRejectedValueOnce(new DOMException('Permission denied', 'NOT_ALLOWED_ERR'))

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toMatchObject({
					name: 'NOT_ALLOWED_ERR',
				})
			})

			it('throws since error is raised from permissions', async () => {
				mockPermissionsQuery.mockImplementationOnce(() => {
					throw new Error('ERR')
				})

				await expect(getUserMediaStream('microphone', { audio: true })).rejects.toEqual(new Error('ERR'))
				expect(mockAcquireMediaStream).not.toHaveBeenCalled()
			})

			describe('permission name not queryable (Firefox/Safari)', () => {
				// `query()` throws a `TypeError` for a device the browser supports through `getUserMedia`
				// but won't let you query (Firefox: camera/microphone). The call must fall through to the
				// stream acquisition rather than leaking the `TypeError`.
				it('falls through to acquireMediaStream when query throws a TypeError', async () => {
					mockPermissionsQuery.mockImplementationOnce(() => {
						throw new TypeError("'camera' is not a valid enum value of type PermissionName")
					})
					mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

					await expect(getUserMediaStream('camera', { video: true })).resolves.toBe(FAKE_STREAM)
					expect(mockAcquireMediaStream).toHaveBeenCalledWith({ video: true }, undefined)
				})
			})

			describe('AbortSignal', () => {
				it('rejects immediately when signal is already aborted', async () => {
					const controller = new AbortController()
					controller.abort()

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockPermissionsQuery).not.toHaveBeenCalled()
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it("rejects when signal is aborted after permission is 'prompt' but before delegating", async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it('rejects when signal is aborted after permission granted but before delegating', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it("gives the abort precedence over a 'denied' state (AbortError, not NOT_ALLOWED_ERR)", async () => {
					// An abort landing while the query settles on a previously-denied permission must reject
					// with `AbortError`, consistent with `getPermission` / `acquirePermission` (issue #145).
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'denied'
					mockPermissionsQuery.mockImplementationOnce(() => {
						controller.abort()
						return Promise.resolve(status)
					})

					await expect(
						getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
					).rejects.toMatchObject({ name: 'AbortError' })
					expect(mockAcquireMediaStream).not.toHaveBeenCalled()
				})

				it('forwards the signal to acquireMediaStream', async () => {
					const controller = new AbortController()
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'granted'
					mockPermissionsQuery.mockResolvedValueOnce(status)
					mockAcquireMediaStream.mockResolvedValueOnce(FAKE_STREAM)

					await expect(
						getUserMediaStream('camera', { video: true }, { signal: controller.signal })
					).resolves.toBe(FAKE_STREAM)
					expect(mockAcquireMediaStream).toHaveBeenCalledWith({ video: true }, controller.signal)
				})
			})
		})
	})
})
