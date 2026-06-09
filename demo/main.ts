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
	// Surfaces the real browser prompt (on the click gesture) so the passive watcher can settle
	// instead of timing out. `push` has no practical in-page trigger and is left without one.
	trigger?: () => void
}

interface ApiSupport {
	label: string
	supported: () => boolean
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
		log(`checkPermission("${name}") ✗ ${error.name}: ${error.message}`, 'error')
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
	log(`getPermission("${entry.name}") →`, 'pending')

	// Passive watcher: it never surfaces a dialog itself, so fire the matching real API to prompt.
	const watcher = entry.getter({ signal: controller.signal, timeout: GETTER_TIMEOUT })
	entry.trigger?.()

	try {
		const state = await watcher
		setResult(resultId, `→ ${state}`, 'success')
		log(`getPermission("${entry.name}") → ${state}`, 'success')
	} catch (err) {
		const error = err as DOMException
		// Abort and timeout are expected user-driven outcomes, not failures.
		const settled = error.name === 'AbortError' || error.name === 'TimeoutError'
		setResult(resultId, `→ ${error.name}`, settled ? 'warning' : 'error')
		log(`getPermission("${entry.name}") ✗ ${error.name}: ${error.message}`, settled ? 'warning' : 'error')
	} finally {
		if (activeController === controller) activeController = null
	}
}

function handleAbort(): void {
	if (activeController) {
		activeController.abort()
		log('abort — cancelled the pending permission watch', 'warning')
	} else {
		log('abort — no active operation', 'warning')
	}
}

function triggerUserMedia(constraints: MediaStreamConstraints): void {
	void navigator.mediaDevices
		?.getUserMedia(constraints)
		.then((stream) => stream.getTracks().forEach((track) => track.stop()))
		.catch(noop)
}

function triggerGeolocation(): void {
	navigator.geolocation?.getCurrentPosition(noop, noop)
}

function triggerNotifications(): void {
	if ('Notification' in window) void Notification.requestPermission()
}

function triggerMidi(): void {
	void navigator.requestMIDIAccess?.({ sysex: true }).catch(noop)
}

function triggerPersistentStorage(): void {
	void navigator.storage?.persist?.().catch(noop)
}

function triggerWakeLock(): void {
	void navigator.wakeLock
		?.request('screen')
		.then((lock) => lock.release())
		.catch(noop)
}

function triggerStorageAccess(): void {
	void document.requestStorageAccess?.().catch(noop)
}

function triggerClipboardRead(): void {
	void navigator.clipboard?.read?.().catch(noop)
}

function triggerClipboardWrite(): void {
	void navigator.clipboard?.writeText?.('').catch(noop)
}

function setResult(id: string, text: string, type: string): void {
	const el = document.getElementById(id)!
	el.textContent = text
	el.className = `result result--${type}`
}

function noop(): void {
	// Intentionally empty: used where a callback is required but its result is irrelevant.
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
