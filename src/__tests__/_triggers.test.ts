vi.mock('../_acquireMediaStream', () => ({ default: vi.fn() }))

import acquireMediaStream from '../_acquireMediaStream'
import {
	cameraTrigger,
	microphoneTrigger,
	geolocationTrigger,
	notificationsTrigger,
	midiTrigger,
	persistentStorageTrigger,
	screenWakeLockTrigger,
	storageAccessTrigger,
} from '../_triggers'

const mockAcquireMediaStream = vi.mocked(acquireMediaStream)

// Stub a property on a host object (navigator/document/globalThis) and restore it afterwards.
// `defineProperty` shadows even inherited accessors that plain assignment cannot overwrite.
const restorers: Array<() => void> = []
const stub = (target: object, key: string, value: unknown): void => {
	const hadOwn = Object.prototype.hasOwnProperty.call(target, key)
	const original = Object.getOwnPropertyDescriptor(target, key)
	Object.defineProperty(target, key, { configurable: true, writable: true, value })
	restorers.push(() => {
		if (hadOwn && original) {
			Object.defineProperty(target, key, original)
		} else {
			delete (target as Record<string, unknown>)[key]
		}
	})
}

afterEach(() => {
	while (restorers.length) {
		restorers.pop()!()
	}
	vi.clearAllMocks()
})

const streamWith = (stop: () => void): MediaStream =>
	({ getTracks: () => [{ stop } as unknown as MediaStreamTrack] }) as unknown as MediaStream

describe('permission triggers', () => {
	describe('cameraTrigger / microphoneTrigger', () => {
		it('cameraTrigger acquires a camera stream (forwarding the signal) and stops its tracks', async () => {
			const stop = vi.fn()
			mockAcquireMediaStream.mockResolvedValueOnce(streamWith(stop))
			const { signal } = new AbortController()

			await expect(cameraTrigger(signal)).resolves.toBeUndefined()
			expect(mockAcquireMediaStream).toHaveBeenCalledWith({ video: true }, signal)
			expect(stop).toHaveBeenCalledOnce()
		})

		it('microphoneTrigger acquires a microphone stream and stops its tracks', async () => {
			const stop = vi.fn()
			mockAcquireMediaStream.mockResolvedValueOnce(streamWith(stop))

			await expect(microphoneTrigger()).resolves.toBeUndefined()
			expect(mockAcquireMediaStream).toHaveBeenCalledWith({ audio: true }, undefined)
			expect(stop).toHaveBeenCalledOnce()
		})

		it('propagates an acquireMediaStream rejection (denial)', async () => {
			mockAcquireMediaStream.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

			await expect(cameraTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})
	})

	describe('geolocationTrigger', () => {
		it('resolves when a position is obtained', async () => {
			stub(navigator, 'geolocation', {
				getCurrentPosition: (success: PositionCallback) => success({} as GeolocationPosition),
			})

			await expect(geolocationTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NotAllowedError when permission is denied', async () => {
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
					error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
			})

			await expect(geolocationTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})

		it('wraps POSITION_UNAVAILABLE in a NotReadableError DOMException, preserving the cause', async () => {
			const positionError = {
				code: 2,
				message: 'unavailable',
				PERMISSION_DENIED: 1,
				TIMEOUT: 3,
			} as GeolocationPositionError
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error(positionError),
			})

			await expect(geolocationTrigger()).rejects.toBeInstanceOf(DOMException)
			await expect(geolocationTrigger()).rejects.toMatchObject({
				name: 'NotReadableError',
				message: 'unavailable',
				cause: positionError,
			})
		})

		it('falls back to a default message when the native error has none', async () => {
			const positionError = { code: 2, message: '', PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error(positionError),
			})

			await expect(geolocationTrigger()).rejects.toMatchObject({
				name: 'NotReadableError',
				message: 'Geolocation unavailable',
			})
		})

		it('wraps TIMEOUT in a TimeoutError DOMException, preserving the cause', async () => {
			const positionError = {
				code: 3,
				message: 'timed out',
				PERMISSION_DENIED: 1,
				TIMEOUT: 3,
			} as GeolocationPositionError
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error(positionError),
			})

			await expect(geolocationTrigger()).rejects.toMatchObject({
				name: 'TimeoutError',
				message: 'timed out',
				cause: positionError,
			})
		})

		it('rejects with NotSupportedError when the Geolocation API is absent', async () => {
			stub(navigator, 'geolocation', undefined)

			await expect(geolocationTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})

	describe('notificationsTrigger', () => {
		it('resolves when permission is granted', async () => {
			stub(globalThis, 'Notification', { requestPermission: () => Promise.resolve('granted') })

			await expect(notificationsTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NotAllowedError when permission is not granted', async () => {
			stub(globalThis, 'Notification', { requestPermission: () => Promise.resolve('denied') })

			await expect(notificationsTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})

		it('rejects with NotSupportedError when the Notification API is absent', async () => {
			stub(globalThis, 'Notification', undefined)

			await expect(notificationsTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})

	describe('midiTrigger', () => {
		it('resolves when MIDI access is granted, requesting only basic (non-sysex) access', async () => {
			const requestMIDIAccess = vi.fn(() => Promise.resolve({} as MIDIAccess))
			stub(navigator, 'requestMIDIAccess', requestMIDIAccess)

			await expect(midiTrigger()).resolves.toBeUndefined()
			expect(requestMIDIAccess).toHaveBeenCalledWith({ sysex: false })
		})

		it('propagates a rejection (denied)', async () => {
			stub(navigator, 'requestMIDIAccess', () => Promise.reject(new DOMException('blocked', 'SecurityError')))

			await expect(midiTrigger()).rejects.toMatchObject({ name: 'SecurityError' })
		})

		it('rejects with NotSupportedError when the Web MIDI API is absent', async () => {
			stub(navigator, 'requestMIDIAccess', undefined)

			await expect(midiTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})

	describe('persistentStorageTrigger', () => {
		it('resolves when persistence is granted', async () => {
			stub(navigator, 'storage', { persist: () => Promise.resolve(true) })

			await expect(persistentStorageTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NotAllowedError when persistence is refused', async () => {
			stub(navigator, 'storage', { persist: () => Promise.resolve(false) })

			await expect(persistentStorageTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})

		it('rejects with NotSupportedError when the StorageManager API is absent', async () => {
			stub(navigator, 'storage', undefined)

			await expect(persistentStorageTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})

	describe('screenWakeLockTrigger', () => {
		it('requests a wake lock and releases it', async () => {
			const release = vi.fn(() => Promise.resolve())
			stub(navigator, 'wakeLock', {
				request: () => Promise.resolve({ release } as unknown as WakeLockSentinel),
			})

			await expect(screenWakeLockTrigger()).resolves.toBeUndefined()
			expect(release).toHaveBeenCalledOnce()
		})

		it('propagates a rejection (page hidden / denied)', async () => {
			stub(navigator, 'wakeLock', {
				request: () => Promise.reject(new DOMException('hidden', 'NotAllowedError')),
			})

			await expect(screenWakeLockTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})

		it('rejects with NotSupportedError when the Screen Wake Lock API is absent', async () => {
			stub(navigator, 'wakeLock', undefined)

			await expect(screenWakeLockTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})

	describe('storageAccessTrigger', () => {
		it('resolves when storage access is granted', async () => {
			stub(document, 'requestStorageAccess', () => Promise.resolve())

			await expect(storageAccessTrigger()).resolves.toBeUndefined()
		})

		it('propagates a rejection (denied / wrong context)', async () => {
			stub(document, 'requestStorageAccess', () => Promise.reject(new DOMException('denied', 'NotAllowedError')))

			await expect(storageAccessTrigger()).rejects.toMatchObject({ name: 'NotAllowedError' })
		})

		it('rejects with NotSupportedError when the Storage Access API is absent', async () => {
			stub(document, 'requestStorageAccess', undefined)

			await expect(storageAccessTrigger()).rejects.toMatchObject({ name: 'NotSupportedError' })
		})
	})
})
