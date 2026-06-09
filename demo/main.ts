import {
	isNavigatorPermissionsSupported,
	isNavigatorMediaDevicesSupported,
	getCameraPermission,
	getClipboardReadPermission,
	getClipboardWritePermission,
	getGeolocationPermission,
	getMicrophonePermission,
	getMidiPermission,
	getNotificationsPermission,
	getPersistentStoragePermission,
	getPushPermission,
	getScreenWakeLockPermission,
	getStorageAccessPermission,
	checkPermission,
	type GetPermissionOptions,
} from '../src/index'

type PermissionGetter = (options?: GetPermissionOptions) => Promise<'granted'>

interface PermissionEntry {
	name: string
	getter: PermissionGetter
	// Fires the real browser API to surface the prompt, resolving when the user/UA has responded.
	// `push` has no practical in-page trigger and is left without one.
	trigger?: () => Promise<unknown>
}

interface ApiSupport {
	label: string
	supported: () => boolean
}

type OutcomeKind = 'granted' | 'denied' | 'prompt' | 'timeout' | 'aborted' | 'error'
interface Outcome {
	kind: OutcomeKind
	detail?: string
}

let activeController: AbortController | null = null

// Every permission the library exposes through a dedicated getter, paired with the browser API
// that actually prompts for it. `name` doubles as the Permissions API query name.
const PERMISSIONS: PermissionEntry[] = [
	{ name: 'camera', getter: getCameraPermission, trigger: () => triggerUserMedia({ video: true }) },
	{ name: 'microphone', getter: getMicrophonePermission, trigger: () => triggerUserMedia({ audio: true }) },
	{ name: 'geolocation', getter: getGeolocationPermission, trigger: triggerGeolocation },
	{ name: 'notifications', getter: getNotificationsPermission, trigger: triggerNotifications },
	{ name: 'midi', getter: getMidiPermission, trigger: triggerMidi },
	{ name: 'push', getter: getPushPermission },
	{ name: 'persistent-storage', getter: getPersistentStoragePermission, trigger: triggerPersistentStorage },
	{ name: 'screen-wake-lock', getter: getScreenWakeLockPermission, trigger: triggerWakeLock },
	{ name: 'storage-access', getter: getStorageAccessPermission, trigger: triggerStorageAccess },
	{ name: 'clipboard-read', getter: getClipboardReadPermission, trigger: triggerClipboardRead },
	{ name: 'clipboard-write', getter: getClipboardWritePermission, trigger: triggerClipboardWrite },
]

// Every browser API the demo relies on to surface a prompt — shown in the API Support card.
const APIS: ApiSupport[] = [
	{ label: 'Permissions', supported: isNavigatorPermissionsSupported },
	{ label: 'MediaDevices', supported: isNavigatorMediaDevicesSupported },
	{ label: 'Geolocation', supported: () => 'geolocation' in navigator },
	{ label: 'Notifications', supported: () => 'Notification' in window },
	{ label: 'Web MIDI', supported: () => 'requestMIDIAccess' in navigator },
	{ label: 'Push', supported: () => 'PushManager' in window },
	{ label: 'Storage Manager', supported: () => 'storage' in navigator },
	{ label: 'Screen Wake Lock', supported: () => 'wakeLock' in navigator },
	{ label: 'Storage Access', supported: () => 'requestStorageAccess' in document },
	{ label: 'Clipboard', supported: () => 'clipboard' in navigator },
]

// Friendly copy for the DOMException names the flow can surface, so logs read in plain language
// instead of raw codes like "NOT_ALLOWED_ERR".
const FRIENDLY_ERRORS: Record<string, string> = {
	NotSupportedError: 'not supported in this browser',
	NOT_SUPPORTED_ERR: 'not supported in this browser',
	SecurityError: 'blocked by the browser',
	TypeError: 'not queryable in this browser',
	InvalidStateError: 'needs a trigger to settle',
}

const GETTER_TIMEOUT = 20000
const STATE_DOT_CLASS: Record<string, string> = { granted: 'supported', denied: 'unsupported', prompt: 'prompt' }
const STATE_LOG_TYPE: Record<string, string> = { granted: 'success', denied: 'warning', prompt: '' }
const logEl = document.getElementById('log')!

document.addEventListener('DOMContentLoaded', () => {
	initSupportStatus(APIS)
	initPermissionStates(PERMISSIONS)
	initDedicatedGetters(PERMISSIONS)

	document.getElementById('abort-btn')!.addEventListener('click', handleAbort)
})

function initSupportStatus(apis: ApiSupport[]): void {
	const container = document.getElementById('api-support')!
	apis.forEach((api) => {
		const ok = api.supported()
		const row = document.createElement('div')
		row.className = 'support-row'
		row.innerHTML =
			`<div class="dot ${ok ? 'supported' : 'unsupported'}"></div>` +
			`<span class="support-label">${api.label}</span>` +
			`<span class="support-value">${ok ? 'supported' : 'not supported'}</span>`
		container.append(row)
	})
}

function initPermissionStates(entries: PermissionEntry[]): void {
	const container = document.getElementById('permission-states')!
	entries.forEach((entry) => {
		const row = document.createElement('div')
		row.className = 'support-row'
		row.innerHTML =
			`<div class="dot" id="dot-permission-${entry.name}"></div>` +
			`<span class="support-label">${entry.name}</span>` +
			`<span class="support-value" id="permission-${entry.name}">—</span>`
		container.append(row)

		watchPermissionState(entry.name)
	})
}

async function watchPermissionState(name: string): Promise<void> {
	try {
		// Read the current state upfront through the library guard — no prompt, no waiting
		const state = await checkPermission(name as PermissionName)
		renderPermissionState(name, state)
		log(`checkPermission("${name}") → ${state}`, STATE_LOG_TYPE[state])

		// Subscribe to live changes (a capability checkPermission intentionally does not cover)
		const status = await navigator.permissions.query({ name: name as PermissionName })
		status.addEventListener('change', () => {
			renderPermissionState(name, status.state)
			log(`permission "${name}" changed → ${status.state}`, STATE_LOG_TYPE[status.state])
		})
	} catch (err) {
		const error = err as DOMException
		renderPermissionState(name, 'error')
		log(`checkPermission("${name}") ✗ ${friendlyError(error)}`, 'error')
	}
}

function renderPermissionState(name: string, state: PermissionState | 'error'): void {
	const dot = document.getElementById(`dot-permission-${name}`)!
	const label = document.getElementById(`permission-${name}`)!
	dot.className = `dot ${state === 'error' ? 'unsupported' : (STATE_DOT_CLASS[state] ?? '')}`
	label.textContent = state
}

function initDedicatedGetters(entries: PermissionEntry[]): void {
	const container = document.getElementById('getter-rows')!
	entries.forEach((entry) => {
		const row = document.createElement('div')
		row.className = 'getter-row'
		row.innerHTML = `<button type="button">${entry.name}</button><span class="result" id="getter-result-${entry.name}">—</span>`
		row.querySelector('button')!.addEventListener('click', () => handleGetPermission(entry))
		container.append(row)
	})
}

async function handleGetPermission(entry: PermissionEntry): Promise<void> {
	// A new watch supersedes any pending one; the Abort button cancels the current watch.
	activeController?.abort()
	const controller = new AbortController()
	activeController = controller

	const resultId = `getter-result-${entry.name}`
	setResult(resultId, 'watching…', 'pending')
	log(`getPermission("${entry.name}") → watching…`, 'pending')

	// Race the library's passive watcher (resolves on the Permissions `change` event) against the
	// real browser API: firing it surfaces the prompt, and once it settles we re-read the state
	// with checkPermission — so the watch resolves even when no `change` event ever arrives.
	const races: Promise<Outcome>[] = [watchOutcome(entry, controller.signal)]
	if (entry.trigger) {
		races.push(triggerOutcome(entry))
	}

	const outcome = await Promise.race(races)

	// Tear down the losing watcher (clears its timeout/listener) and release the slot.
	controller.abort()
	if (activeController === controller) {
		activeController = null
	}

	const { text, type } = describeOutcome(entry, outcome)
	setResult(resultId, `→ ${text}`, type)
	log(`getPermission("${entry.name}") → ${text}`, type)
}

// The library watcher: resolves with 'granted', or maps its rejection to a friendly outcome.
async function watchOutcome(entry: PermissionEntry, signal: AbortSignal): Promise<Outcome> {
	try {
		await entry.getter({ signal, timeout: GETTER_TIMEOUT })
		return { kind: 'granted' }
	} catch (err) {
		return errorToOutcome(err as DOMException)
	}
}

// The trigger path: fire the real API, then read the resulting state with checkPermission.
async function triggerOutcome(entry: PermissionEntry): Promise<Outcome> {
	try {
		await entry.trigger?.()
	} catch {
		// The trigger rejects on denial/blocking; the checkPermission read below reflects the state.
	}
	try {
		const state = await checkPermission(entry.name as PermissionName)
		return { kind: state }
	} catch (err) {
		return errorToOutcome(err as DOMException)
	}
}

function errorToOutcome(err: DOMException): Outcome {
	switch (err.name) {
		case 'NotAllowedError':
		case 'NOT_ALLOWED_ERR':
			return { kind: 'denied' }
		case 'TimeoutError':
			return { kind: 'timeout' }
		case 'AbortError':
			return { kind: 'aborted' }
		default:
			return { kind: 'error', detail: friendlyError(err) }
	}
}

function describeOutcome(entry: PermissionEntry, outcome: Outcome): { text: string; type: string } {
	switch (outcome.kind) {
		case 'granted':
			return { text: 'granted', type: 'success' }
		case 'denied':
			return { text: 'denied', type: 'warning' }
		case 'prompt':
			return { text: 'dismissed — no choice made', type: 'warning' }
		case 'timeout':
			return {
				text: entry.trigger ? 'timed out — no response' : 'no in-page trigger — timed out',
				type: 'warning',
			}
		case 'aborted':
			return { text: 'cancelled', type: 'warning' }
		case 'error':
			return { text: outcome.detail ?? 'unavailable', type: 'error' }
	}
}

function friendlyError(err: DOMException): string {
	return FRIENDLY_ERRORS[err.name] ?? err.message ?? err.name
}

function handleAbort(): void {
	if (activeController) {
		activeController.abort()
		log('abort — cancelled the pending permission watch', 'warning')
	} else {
		log('abort — no active operation', 'warning')
	}
}

function triggerUserMedia(constraints: MediaStreamConstraints): Promise<void> {
	const media = navigator.mediaDevices?.getUserMedia(constraints)
	if (!media) {
		return Promise.resolve()
	}
	return media.then((stream) => stream.getTracks().forEach((track) => track.stop()))
}

function triggerGeolocation(): Promise<void> {
	return new Promise((resolve) => {
		if (!('geolocation' in navigator)) {
			resolve()
			return
		}
		navigator.geolocation.getCurrentPosition(
			() => resolve(),
			() => resolve()
		)
	})
}

function triggerNotifications(): Promise<unknown> {
	return 'Notification' in window ? Notification.requestPermission() : Promise.resolve()
}

function triggerMidi(): Promise<unknown> {
	return navigator.requestMIDIAccess?.({ sysex: true }) ?? Promise.resolve()
}

function triggerPersistentStorage(): Promise<unknown> {
	return navigator.storage?.persist?.() ?? Promise.resolve()
}

function triggerWakeLock(): Promise<unknown> {
	const lock = navigator.wakeLock?.request('screen')
	if (!lock) {
		return Promise.resolve()
	}
	return lock.then((sentinel) => sentinel.release())
}

function triggerStorageAccess(): Promise<unknown> {
	return document.requestStorageAccess?.() ?? Promise.resolve()
}

function triggerClipboardRead(): Promise<unknown> {
	return navigator.clipboard?.read?.() ?? Promise.resolve()
}

function triggerClipboardWrite(): Promise<unknown> {
	return navigator.clipboard?.writeText?.('') ?? Promise.resolve()
}

function setResult(id: string, text: string, type: string): void {
	const el = document.getElementById(id)!
	el.textContent = text
	el.className = `result result--${type}`
}

function log(message: string, type = ''): void {
	const empty = logEl.querySelector('.empty-log')
	if (empty) empty.remove()

	const time = new Date().toLocaleTimeString()
	const entry = document.createElement('div')
	entry.className = `log-entry${type ? ` ${type}` : ''}`
	entry.innerHTML = `<span class="time">${time}</span><span class="msg">${message}</span>`
	logEl.append(entry)
	logEl.scrollTop = logEl.scrollHeight
}
