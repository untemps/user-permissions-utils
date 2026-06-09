import getCameraPermission from '../getCameraPermission'
import getClipboardReadPermission from '../getClipboardReadPermission'
import getClipboardWritePermission from '../getClipboardWritePermission'
import getGeolocationPermission from '../getGeolocationPermission'
import getMicrophonePermission from '../getMicrophonePermission'
import getMidiPermission from '../getMidiPermission'
import getNotificationsPermission from '../getNotificationsPermission'
import getPersistentStoragePermission from '../getPersistentStoragePermission'
import getPushPermission from '../getPushPermission'
import getScreenWakeLockPermission from '../getScreenWakeLockPermission'
import getStorageAccessPermission from '../getStorageAccessPermission'
import type { GetPermissionOptions } from '../getPermission'
import {
	setNavigatorApiUnsupported,
	restoreNavigatorApi,
	setupPermissionsMock,
	teardownPermissionsMock,
	type MockPermissionStatus,
} from './testUtils'

type PermissionGetter = (options?: GetPermissionOptions) => Promise<'granted'>

// Each dedicated getter is a one-line wrapper around `getPermission` with a single hardcoded
// permission name. Rather than one near-identical test file per wrapper (the repo's usual 1:1
// source-to-test convention), a single parametrized suite drives every getter through the same
// table, so the shared contract is asserted once and identically for all of them.
const getters: ReadonlyArray<{ label: string; getter: PermissionGetter; name: string }> = [
	{ label: 'getCameraPermission', getter: getCameraPermission, name: 'camera' },
	{ label: 'getClipboardReadPermission', getter: getClipboardReadPermission, name: 'clipboard-read' },
	{ label: 'getClipboardWritePermission', getter: getClipboardWritePermission, name: 'clipboard-write' },
	{ label: 'getGeolocationPermission', getter: getGeolocationPermission, name: 'geolocation' },
	{ label: 'getMicrophonePermission', getter: getMicrophonePermission, name: 'microphone' },
	{ label: 'getMidiPermission', getter: getMidiPermission, name: 'midi' },
	{ label: 'getNotificationsPermission', getter: getNotificationsPermission, name: 'notifications' },
	{ label: 'getPersistentStoragePermission', getter: getPersistentStoragePermission, name: 'persistent-storage' },
	{ label: 'getPushPermission', getter: getPushPermission, name: 'push' },
	{ label: 'getScreenWakeLockPermission', getter: getScreenWakeLockPermission, name: 'screen-wake-lock' },
	{ label: 'getStorageAccessPermission', getter: getStorageAccessPermission, name: 'storage-access' },
]

describe('dedicated permission getters', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it.each(getters)('$label rejects with NOT_SUPPORTED_ERR', async ({ getter }) => {
			await expect(getter()).rejects.toMatchObject({
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

		it.each(getters)('$label queries "$name" and resolves with "granted"', async ({ getter, name }) => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			await expect(getter()).resolves.toBe('granted')
			expect(mockPermissionsQuery).toHaveBeenCalledWith({ name })
		})

		describe('options forwarding', () => {
			// Parametrized over every getter: an already-aborted signal makes getPermission bail out
			// (`signal?.throwIfAborted()`) before it ever queries — but only if `options` was actually
			// forwarded. This proves the pass-through for all 11 wrappers, which neither the name-only
			// assertion above nor line coverage can: a wrapper that dropped `options` would instead
			// query and never reject with `AbortError` here.
			it.each(getters)('$label forwards the signal to getPermission', async ({ getter }) => {
				const controller = new AbortController()
				controller.abort()

				await expect(getter({ signal: controller.signal })).rejects.toMatchObject({
					name: 'AbortError',
				})
				expect(mockPermissionsQuery).not.toHaveBeenCalled()
			})

			it('forwards the timeout to getPermission (prompt state rejects with TimeoutError)', async () => {
				vi.useFakeTimers()
				try {
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					mockPermissionsQuery.mockResolvedValueOnce(status)

					const promise = getCameraPermission({ timeout: 1000 })
					const expectation = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' })
					await vi.advanceTimersByTimeAsync(1000)
					await expectation
				} finally {
					vi.useRealTimers()
				}
			})
		})
	})
})
