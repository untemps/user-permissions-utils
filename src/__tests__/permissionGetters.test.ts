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

// Every dedicated getter is a one-line wrapper: the active ones over `acquirePermission` (with a
// hardcoded name + native trigger), the passive ones over `getPermission`. Rather than one
// near-identical test file per wrapper (the repo's usual 1:1 convention), a single parametrized
// suite drives every getter through the contract they all share — guard, `'granted'` short-circuit
// and options forwarding — leaving the active trigger/acquire mechanics to `_acquirePermission` and
// `_triggers` tests. The `passive` flag marks the three getters that intentionally never prompt.
const getters: ReadonlyArray<{
	label: string
	getter: PermissionGetter
	name: string
	passive?: true
	descriptor?: PermissionDescriptor
}> = [
	{ label: 'getCameraPermission', getter: getCameraPermission, name: 'camera' },
	{ label: 'getMicrophonePermission', getter: getMicrophonePermission, name: 'microphone' },
	{ label: 'getGeolocationPermission', getter: getGeolocationPermission, name: 'geolocation' },
	{ label: 'getNotificationsPermission', getter: getNotificationsPermission, name: 'notifications' },
	{ label: 'getMidiPermission', getter: getMidiPermission, name: 'midi' },
	{ label: 'getPersistentStoragePermission', getter: getPersistentStoragePermission, name: 'persistent-storage' },
	{ label: 'getScreenWakeLockPermission', getter: getScreenWakeLockPermission, name: 'screen-wake-lock' },
	{ label: 'getStorageAccessPermission', getter: getStorageAccessPermission, name: 'storage-access' },
	{
		label: 'getPushPermission',
		getter: getPushPermission,
		name: 'push',
		passive: true,
		descriptor: { name: 'push', userVisibleOnly: true } as PermissionDescriptor,
	},
	{ label: 'getClipboardReadPermission', getter: getClipboardReadPermission, name: 'clipboard-read', passive: true },
	{
		label: 'getClipboardWritePermission',
		getter: getClipboardWritePermission,
		name: 'clipboard-write',
		passive: true,
	},
]

describe('dedicated permission getters', () => {
	describe('navigator.permissions is not implemented', () => {
		beforeAll(() => setNavigatorApiUnsupported('permissions'))
		afterAll(() => restoreNavigatorApi('permissions'))

		it.each(getters)('$label rejects with NotSupportedError', async ({ getter }) => {
			await expect(getter()).rejects.toMatchObject({
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

		// On an already-`'granted'` state both kinds short-circuit to `'granted'` without ever firing
		// a trigger, so this asserts the hardcoded name for all eleven without mocking native APIs.
		it.each(getters)('$label queries "$name" and resolves with "granted"', async ({ getter, name, descriptor }) => {
			const status = new PermissionStatus() as unknown as MockPermissionStatus
			status.state = 'granted'
			mockPermissionsQuery.mockResolvedValueOnce(status)

			await expect(getter()).resolves.toBe('granted')
			expect(mockPermissionsQuery).toHaveBeenCalledWith(descriptor ?? { name })
		})

		it.each([
			{
				mode: 'throws synchronously',
				fail: () =>
					mockPermissionsQuery.mockImplementationOnce(() => {
						throw new TypeError("'push' is not a valid enum value of type PermissionName")
					}),
			},
			{
				mode: 'rejects its promise',
				fail: () =>
					mockPermissionsQuery.mockRejectedValueOnce(
						new TypeError("'push' is not a valid enum value of type PermissionName")
					),
			},
		])(
			'getPushPermission normalizes a query() TypeError ($mode) to a NotSupportedError DOMException',
			async ({ fail }) => {
				fail()

				const promise = getPushPermission()
				await expect(promise).rejects.toBeInstanceOf(DOMException)
				await expect(promise).rejects.toMatchObject({ name: 'NotSupportedError' })
			}
		)

		describe('options forwarding', () => {
			// Parametrized over every getter: an already-aborted signal makes both `acquirePermission`
			// and `getPermission` bail out (`signal?.throwIfAborted()`) before they ever query — but
			// only if `options` was actually forwarded. This proves the pass-through for all eleven
			// wrappers, which neither the name-only assertion above nor line coverage can: a wrapper
			// that dropped `options` would instead query and never reject with `AbortError` here.
			it.each(getters)('$label forwards the signal', async ({ getter }) => {
				const controller = new AbortController()
				controller.abort()

				await expect(getter({ signal: controller.signal })).rejects.toMatchObject({
					name: 'AbortError',
				})
				expect(mockPermissionsQuery).not.toHaveBeenCalled()
			})

			// The passive getters delegate straight to `getPermission`, whose `'prompt'` wait is bounded
			// by `timeout` — so the timeout must reach it. (Active getters time out around their trigger;
			// that path is covered in `_acquirePermission`.)
			it('forwards the timeout to the passive getters (prompt state rejects with TimeoutError)', async () => {
				vi.useFakeTimers()
				try {
					const status = new PermissionStatus() as unknown as MockPermissionStatus
					status.state = 'prompt'
					mockPermissionsQuery.mockResolvedValueOnce(status)

					const promise = getPushPermission({ timeout: 1000 })
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
