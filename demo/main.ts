import {
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
	watchPermission,
	type GetPermissionOptions,
} from '../src/index'

type PermissionGetter = (options?: GetPermissionOptions) => Promise<'granted'>

interface PermissionEntry {
	name: string
	getter: PermissionGetter
	// Passive getters (push, clipboard) never surface a dialog — the library cannot trigger them
	// without consumer-owned infrastructure or a privacy-sensitive side effect — so they only watch.
	passive?: boolean
}

interface ApiSupport {
	label: string
	supported: () => boolean
}

type OutcomeKind = 'granted' | 'denied' | 'timeout' | 'aborted' | 'error'
interface Outcome {
	kind: OutcomeKind
	detail?: string
}

let activeController: AbortController | null = null

// Every permission the library exposes through a dedicated getter. The active getters surface the
// real prompt themselves; the passive ones only watch the state. `name` doubles as the Permissions
// API query name.
const PERMISSIONS: PermissionEntry[] = [
	{ name: 'camera', getter: getCameraPermission },
	{ name: 'microphone', getter: getMicrophonePermission },
	{ name: 'geolocation', getter: getGeolocationPermission },
	{ name: 'notifications', getter: getNotificationsPermission },
	{ name: 'midi', getter: getMidiPermission },
	{ name: 'persistent-storage', getter: getPersistentStoragePermission },
	{ name: 'screen-wake-lock', getter: getScreenWakeLockPermission },
	{ name: 'storage-access', getter: getStorageAccessPermission },
	{ name: 'push', getter: getPushPermission, passive: true },
	{ name: 'clipboard-read', getter: getClipboardReadPermission, passive: true },
	{ name: 'clipboard-write', getter: getClipboardWritePermission, passive: true },
]

// Every browser API the dedicated getters rely on to surface a prompt — shown in the API Support card.
const APIS: ApiSupport[] = [
	{ label: 'Permissions', supported: () => 'permissions' in navigator },
	{ label: 'MediaDevices', supported: () => 'mediaDevices' in navigator },
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

		// Subscribe to live changes through the library — no raw navigator.permissions call. The
		// upfront emit is already covered by checkPermission above, so watch transitions only.
		await watchPermission(
			name as PermissionName,
			(state) => {
				renderPermissionState(name, state)
				log(`permission "${name}" changed → ${state}`, STATE_LOG_TYPE[state])
			},
			{ emitImmediately: false }
		)
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
	// A new acquisition supersedes any pending one; the Abort button cancels the current one.
	activeController?.abort()
	const controller = new AbortController()
	activeController = controller

	const resultId = `getter-result-${entry.name}`
	setResult(resultId, 'watching…', 'pending')
	log(`${entry.name} → watching…`, 'pending')

	// The getter does it all: it reads the state and, on 'prompt', surfaces the real prompt and
	// resolves once the permission settles. No native API call here — the library owns the trigger.
	let outcome: Outcome
	try {
		await entry.getter({ signal: controller.signal, timeout: GETTER_TIMEOUT })
		outcome = { kind: 'granted' }
	} catch (err) {
		outcome = errorToOutcome(err as DOMException)
	} finally {
		if (activeController === controller) {
			activeController = null
		}
	}

	const { text, type } = describeOutcome(entry, outcome)
	setResult(resultId, `→ ${text}`, type)
	log(`${entry.name} → ${text}`, type)
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
		case 'timeout':
			return {
				text: entry.passive ? 'passive watcher — no prompt to surface' : 'timed out — no response',
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
		log('abort — cancelled the pending permission acquisition', 'warning')
	} else {
		log('abort — no active operation', 'warning')
	}
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
