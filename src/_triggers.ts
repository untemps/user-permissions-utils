import acquireMediaStream from './_acquireMediaStream'
import type { PermissionTrigger } from './_acquirePermission'

const permissionDenied = (): DOMException => new DOMException('Permission denied', 'NotAllowedError')

// A permission can be queryable while the API that surfaces its prompt is absent (old browsers,
// non-secure contexts, workers); normalise that to `NotSupportedError` rather than leak a raw
// `TypeError` from `undefined.someMethod()`.
const notSupported = (api: string): DOMException => new DOMException(`${api} not supported`, 'NotSupportedError')

const stopTracks = (stream: MediaStream): void => {
	stream.getTracks().forEach((track) => track.stop())
}

// Native calls that surface each permission's dialog, normalised to resolve only on grant and reject
// with a `DOMException` (`NotAllowedError` denied, `NotSupportedError` absent) so `acquirePermission`
// treats them identically. camera/microphone delegate to `acquireMediaStream` (the `getUserMedia` core
// of `getUserMediaStream`, minus the permission query `acquirePermission` has already performed).

export const cameraTrigger: PermissionTrigger = (signal) => acquireMediaStream({ video: true }, signal).then(stopTracks)

export const microphoneTrigger: PermissionTrigger = (signal) =>
	acquireMediaStream({ audio: true }, signal).then(stopTracks)

export const geolocationTrigger: PermissionTrigger = () =>
	new Promise<void>((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(notSupported('Navigator API: geolocation'))
			return
		}
		navigator.geolocation.getCurrentPosition(
			() => resolve(),
			// Only PERMISSION_DENIED is a denial; POSITION_UNAVAILABLE/TIMEOUT propagate as-is.
			(error) => reject(error.code === error.PERMISSION_DENIED ? permissionDenied() : error)
		)
	})

export const notificationsTrigger: PermissionTrigger = async () => {
	if (typeof Notification === 'undefined') {
		throw notSupported('Notification API')
	}
	if ((await Notification.requestPermission()) !== 'granted') {
		throw permissionDenied()
	}
}

export const midiTrigger: PermissionTrigger = async () => {
	if (!navigator.requestMIDIAccess) {
		throw notSupported('Navigator API: requestMIDIAccess')
	}
	// Basic (non-sysex) access only — least privilege; browsers that auto-grant it may not prompt.
	await navigator.requestMIDIAccess({ sysex: false })
}

export const persistentStorageTrigger: PermissionTrigger = async () => {
	if (!navigator.storage) {
		throw notSupported('Navigator API: storage')
	}
	if (!(await navigator.storage.persist())) {
		throw permissionDenied()
	}
}

export const screenWakeLockTrigger: PermissionTrigger = async () => {
	if (!navigator.wakeLock) {
		throw notSupported('Navigator API: wakeLock')
	}
	const sentinel = await navigator.wakeLock.request('screen')
	await sentinel.release()
}

export const storageAccessTrigger: PermissionTrigger = async () => {
	if (!document.requestStorageAccess) {
		throw notSupported('Document API: requestStorageAccess')
	}
	await document.requestStorageAccess()
}
