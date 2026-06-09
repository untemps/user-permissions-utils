import getUserMediaStream from './getUserMediaStream'
import type { PermissionTrigger } from './_acquirePermission'

const permissionDenied = (): DOMException => new DOMException('Permission denied', 'NOT_ALLOWED_ERR')

const stopTracks = (stream: MediaStream): void => {
	stream.getTracks().forEach((track) => track.stop())
}

// Native calls that surface each permission's real dialog, normalised so they resolve only when
// the permission is granted and reject with a `DOMException` otherwise — letting
// `acquirePermission` treat every permission identically. `camera`/`microphone` delegate to
// `getUserMediaStream`, the library's existing acquisition path (which also tears the acquired
// stream down on abort), and release the stream once the grant is confirmed.

export const cameraTrigger: PermissionTrigger = (signal) =>
	getUserMediaStream('camera', { video: true }, { signal }).then(stopTracks)

export const microphoneTrigger: PermissionTrigger = (signal) =>
	getUserMediaStream('microphone', { audio: true }, { signal }).then(stopTracks)

export const geolocationTrigger: PermissionTrigger = () =>
	new Promise<void>((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(
			() => resolve(),
			// The error callback conflates denial with POSITION_UNAVAILABLE/TIMEOUT: only a
			// PERMISSION_DENIED maps to a denial; other failures propagate as-is.
			(error) => reject(error.code === error.PERMISSION_DENIED ? permissionDenied() : error)
		)
	})

export const notificationsTrigger: PermissionTrigger = async () => {
	if ((await Notification.requestPermission()) !== 'granted') {
		throw permissionDenied()
	}
}

export const midiTrigger: PermissionTrigger = () => navigator.requestMIDIAccess({ sysex: true }).then(() => undefined)

export const persistentStorageTrigger: PermissionTrigger = async () => {
	if (!(await navigator.storage.persist())) {
		throw permissionDenied()
	}
}

export const screenWakeLockTrigger: PermissionTrigger = () =>
	navigator.wakeLock.request('screen').then((sentinel) => sentinel.release())

export const storageAccessTrigger: PermissionTrigger = () => document.requestStorageAccess().then(() => undefined)
