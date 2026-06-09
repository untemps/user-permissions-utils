vi.mock('../getUserMediaStream', () => ({ default: vi.fn() }))

import getUserMediaStream from '../getUserMediaStream'
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

const mockGetUserMediaStream = vi.mocked(getUserMediaStream)

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
			mockGetUserMediaStream.mockResolvedValueOnce(streamWith(stop))
			const { signal } = new AbortController()

			await expect(cameraTrigger(signal)).resolves.toBeUndefined()
			expect(mockGetUserMediaStream).toHaveBeenCalledWith('camera', { video: true }, { signal })
			expect(stop).toHaveBeenCalledOnce()
		})

		it('microphoneTrigger acquires a microphone stream and stops its tracks', async () => {
			const stop = vi.fn()
			mockGetUserMediaStream.mockResolvedValueOnce(streamWith(stop))

			await expect(microphoneTrigger()).resolves.toBeUndefined()
			expect(mockGetUserMediaStream).toHaveBeenCalledWith('microphone', { audio: true }, { signal: undefined })
			expect(stop).toHaveBeenCalledOnce()
		})

		it('propagates a getUserMediaStream rejection (denial)', async () => {
			mockGetUserMediaStream.mockRejectedValueOnce(new DOMException('Permission denied', 'NOT_ALLOWED_ERR'))

			await expect(cameraTrigger()).rejects.toMatchObject({ name: 'NOT_ALLOWED_ERR' })
		})
	})

	describe('geolocationTrigger', () => {
		it('resolves when a position is obtained', async () => {
			stub(navigator, 'geolocation', {
				getCurrentPosition: (success: PositionCallback) => success({} as GeolocationPosition),
			})

			await expect(geolocationTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NOT_ALLOWED_ERR when permission is denied', async () => {
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
					error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
			})

			await expect(geolocationTrigger()).rejects.toMatchObject({ name: 'NOT_ALLOWED_ERR' })
		})

		it('propagates other geolocation failures (position unavailable)', async () => {
			const positionError = { code: 2, PERMISSION_DENIED: 1 } as GeolocationPositionError
			stub(navigator, 'geolocation', {
				getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => error(positionError),
			})

			await expect(geolocationTrigger()).rejects.toBe(positionError)
		})
	})

	describe('notificationsTrigger', () => {
		it('resolves when permission is granted', async () => {
			stub(globalThis, 'Notification', { requestPermission: () => Promise.resolve('granted') })

			await expect(notificationsTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NOT_ALLOWED_ERR when permission is not granted', async () => {
			stub(globalThis, 'Notification', { requestPermission: () => Promise.resolve('denied') })

			await expect(notificationsTrigger()).rejects.toMatchObject({ name: 'NOT_ALLOWED_ERR' })
		})
	})

	describe('midiTrigger', () => {
		it('resolves when MIDI access is granted, requesting sysex', async () => {
			const requestMIDIAccess = vi.fn(() => Promise.resolve({} as MIDIAccess))
			stub(navigator, 'requestMIDIAccess', requestMIDIAccess)

			await expect(midiTrigger()).resolves.toBeUndefined()
			expect(requestMIDIAccess).toHaveBeenCalledWith({ sysex: true })
		})

		it('propagates a rejection (denied)', async () => {
			stub(navigator, 'requestMIDIAccess', () => Promise.reject(new DOMException('blocked', 'SecurityError')))

			await expect(midiTrigger()).rejects.toMatchObject({ name: 'SecurityError' })
		})
	})

	describe('persistentStorageTrigger', () => {
		it('resolves when persistence is granted', async () => {
			stub(navigator, 'storage', { persist: () => Promise.resolve(true) })

			await expect(persistentStorageTrigger()).resolves.toBeUndefined()
		})

		it('rejects with NOT_ALLOWED_ERR when persistence is refused', async () => {
			stub(navigator, 'storage', { persist: () => Promise.resolve(false) })

			await expect(persistentStorageTrigger()).rejects.toMatchObject({ name: 'NOT_ALLOWED_ERR' })
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
	})
})
