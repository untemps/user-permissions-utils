import getUserMediaStream from './getUserMediaStream'
import type { PermissionTrigger } from './_acquirePermission'

const permissionDenied = (): DOMException => new DOMException('Permission denied', 'NOT_ALLOWED_ERR')

// A permission can be queryable through `navigator.permissions` while the native API that surfaces
// its prompt is missing (older browsers, non-secure contexts, workers). Normalise that gap to the
// library's `NOT_SUPPORTED_ERR` `DOMException` — the same name every other entry point throws when
// its API is absent — so consumers detect "unsupported" uniformly (catch the name) instead of a raw
// `TypeError` leaking from `undefined.someMethod()`.
const notSupported = (api: string): DOMException => new DOMException(`${api} not supported`, 'NOT_SUPPORTED_ERR')

const stopTracks = (stream: MediaStream): void => {
	stream.getTracks().forEach((track) => track.stop())
}

// Native calls that surface each permission's real dialog, normalised so they resolve only when the
// permission is granted and reject with a `DOMException` otherwise (`NOT_ALLOWED_ERR` on denial,
// `NOT_SUPPORTED_ERR` when the native API is absent) — letting `acquirePermission` treat every
// permission identically. `camera`/`microphone` delegate to `getUserMediaStream`, the library's
// existing acquisition path (which already throws `NOT_SUPPORTED_ERR` when `navigator.mediaDevices`
// is missing, tears the acquired stream down on abort, and releases it once the grant is confirmed).

export const cameraTrigger: PermissionTrigger = (signal) =>
	getUserMediaStream('camera', { video: true }, { signal }).then(stopTracks)

export const microphoneTrigger: PermissionTrigger = (signal) =>
	getUserMediaStream('microphone', { audio: true }, { signal }).then(stopTracks)

export const geolocationTrigger: PermissionTrigger = () =>
	new Promise<void>((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(notSupported('Navigator API: geolocation'))
			return
		}
		navigator.geolocation.getCurrentPosition(
			() => resolve(),
			// The error callback conflates denial with POSITION_UNAVAILABLE/TIMEOUT: only a
			// PERMISSION_DENIED maps to a denial; other failures propagate as-is.
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
	// Request only the basic `midi` permission queried above (no sysex) — least privilege, never
	// escalating to the more sensitive sysex grant. Browsers that auto-grant non-sysex MIDI may
	// therefore resolve this without ever surfacing a dialog.
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
