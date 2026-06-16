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
	isMediaDevicesSupported,
	type GetPermissionOptions,
	type PermissionQueryDescriptor,
} from '../src/index'

type PermissionGetter = (options?: GetPermissionOptions) => Promise<'granted'>

interface PermissionEntry {
	name: string
	getter: PermissionGetter
	// Passive getters (push, clipboard) never surface a dialog — the library cannot trigger them
	// without consumer-owned infrastructure or a privacy-sensitive side effect — so they only watch.
	passive?: boolean
	// Some permissions need extra query members to be readable: Chromium rejects `{ name: 'push' }`
	// without `userVisibleOnly: true`. When set, this descriptor is passed to checkPermission /
	// watchPermission instead of the bare name.
	query?: PermissionQueryDescriptor
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
	{ name: 'push', getter: getPushPermission, passive: true, query: { name: 'push', userVisibleOnly: true } },
	{ name: 'clipboard-read', getter: getClipboardReadPermission, passive: true },
	{ name: 'clipboard-write', getter: getClipboardWritePermission, passive: true },
]

// Every browser API the dedicated getters rely on to surface a prompt — shown in the API Support card.
const APIS: ApiSupport[] = [
	{ label: 'Permissions', supported: () => 'permissions' in navigator },
	// Uses the library's synchronous, SSR-safe predicate instead of poking `navigator` directly —
	// it also confirms `getUserMedia` is present, not just that `mediaDevices` exists.
	{ label: 'MediaDevices', supported: isMediaDevicesSupported },
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
// instead of raw names like "NotSupportedError".
const FRIENDLY_ERRORS: Record<string, string> = {
	NotSupportedError: 'not supported in this browser',
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

		const dot = document.createElement('div')
		dot.className = `dot ${ok ? 'supported' : 'unsupported'}`

		const label = document.createElement('span')
		label.className = 'support-label'
		label.textContent = api.label

		const value = document.createElement('span')
		value.className = 'support-value'
		value.textContent = ok ? 'supported' : 'not supported'

		row.append(dot, label, value)
		container.append(row)
	})
}

function initPermissionStates(entries: PermissionEntry[]): void {
	const container = document.getElementById('permission-states')!
	entries.forEach((entry) => {
		const row = document.createElement('div')
		row.className = 'support-row'

		const dot = document.createElement('div')
		dot.className = 'dot'
		dot.id = `dot-permission-${entry.name}`

		const label = document.createElement('span')
		label.className = 'support-label'
		label.textContent = entry.name

		const value = document.createElement('span')
		value.className = 'support-value'
		value.id = `permission-${entry.name}`
		value.textContent = '—'

		row.append(dot, label, value)
		container.append(row)

		watchPermissionState(entry)
	})
}

async function watchPermissionState(entry: PermissionEntry): Promise<void> {
	const { name } = entry
	// Pass the full descriptor when the permission needs extra query members (e.g. push); otherwise the
	// bare name. clipboard-* aren't in the DOM PermissionName union yet, hence the cast.
	const query = entry.query ?? (name as PermissionName)
	try {
		// Read the current state upfront through the library guard — no prompt, no waiting
		const state = await checkPermission(query)
		renderPermissionState(name, state)
		log(`checkPermission("${name}") → ${state}`, STATE_LOG_TYPE[state])

		await watchPermission(
			query,
			(state) => {
				renderPermissionState(name, state)
				log(`permission "${name}" changed → ${state}`, STATE_LOG_TYPE[state])
			},
			{ emitImmediately: false }
		)
	} catch (err) {
		const error = err as DOMException
		renderPermissionState(name, 'error')
		log(`permission "${name}" ✗ ${friendlyError(error)}`, 'error')
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

		const button = document.createElement('button')
		button.type = 'button'
		button.textContent = entry.name
		button.addEventListener('click', () => handleGetPermission(entry))

		const result = document.createElement('span')
		result.className = 'result'
		result.id = `getter-result-${entry.name}`
		result.textContent = '—'

		row.append(button, result)
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

	const timeEl = document.createElement('span')
	timeEl.className = 'time'
	timeEl.textContent = time

	const msgEl = document.createElement('span')
	msgEl.className = 'msg'
	msgEl.textContent = message

	entry.append(timeEl, msgEl)
	logEl.append(entry)
	logEl.scrollTop = logEl.scrollHeight
}
