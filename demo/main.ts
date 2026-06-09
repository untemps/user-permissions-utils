import {
	isNavigatorPermissionsSupported,
	isNavigatorMediaDevicesSupported,
	getUserMediaStream,
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
	// Optional in-page action that surfaces the real prompt so a passive watcher can settle.
	trigger?: () => void
}

let activeController: AbortController | null = null
let activeStream: MediaStream | null = null

// Every permission the library exposes through a dedicated getter. `name` doubles as the
// Permissions API query name; `clipboard-read`/`clipboard-write` are valid at runtime but
// outside the DOM `PermissionName` type, hence the assertions at the call sites below.
const PERMISSIONS: PermissionEntry[] = [
	{ name: 'camera', getter: getCameraPermission },
	{ name: 'microphone', getter: getMicrophonePermission },
	{ name: 'geolocation', getter: getGeolocationPermission, trigger: triggerGeolocation },
	{ name: 'notifications', getter: getNotificationsPermission, trigger: triggerNotifications },
	{ name: 'midi', getter: getMidiPermission },
	{ name: 'push', getter: getPushPermission },
	{ name: 'persistent-storage', getter: getPersistentStoragePermission },
	{ name: 'screen-wake-lock', getter: getScreenWakeLockPermission },
	{ name: 'storage-access', getter: getStorageAccessPermission },
	{ name: 'clipboard-read', getter: getClipboardReadPermission },
	{ name: 'clipboard-write', getter: getClipboardWritePermission },
]

const GETTER_TIMEOUT = 10000
const STATE_DOT_CLASS: Record<string, string> = { granted: 'supported', denied: 'unsupported', prompt: 'prompt' }
const STATE_LOG_TYPE: Record<string, string> = { granted: 'success', denied: 'warning', prompt: '' }
const logEl = document.getElementById('log')!

document.addEventListener('DOMContentLoaded', () => {
	initSupportStatus()
	initPermissionStates(PERMISSIONS)
	initDedicatedGetters(PERMISSIONS)

	document.querySelectorAll<HTMLElement>('[data-action="getUserMediaStream"]').forEach((btn) => {
		btn.addEventListener('click', () =>
			handleGetUserMediaStream(btn.dataset.permission as PermissionName, JSON.parse(btn.dataset.constraints!))
		)
	})

	document.getElementById('abort-btn')!.addEventListener('click', handleAbort)
})

function initSupportStatus(): void {
	const permissionsOk = isNavigatorPermissionsSupported()
	const mediaDevicesOk = isNavigatorMediaDevicesSupported()

	setSupport('permissions', permissionsOk)
	setSupport('mediadevices', mediaDevicesOk)
}

function setSupport(key: string, ok: boolean): void {
	document.getElementById(`dot-${key}`)!.classList.add(ok ? 'supported' : 'unsupported')
	document.getElementById(`${key}-support`)!.textContent = ok ? 'supported' : 'not supported'
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
	const resultId = `getter-result-${entry.name}`
	setResult(resultId, 'watching…', 'pending')
	log(`getPermission("${entry.name}") [dedicated, ${GETTER_TIMEOUT}ms] →`, 'pending')

	// Passive watcher: resolves once the permission becomes 'granted'. It never surfaces a dialog
	// on its own, so we fire the matching in-page trigger (when one exists) to settle the wait.
	const watcher = entry.getter({ timeout: GETTER_TIMEOUT })
	entry.trigger?.()

	try {
		const state = await watcher
		setResult(resultId, `→ ${state}`, 'success')
		log(`getPermission("${entry.name}") → ${state}`, 'success')
	} catch (err) {
		const error = err as DOMException
		const type = error.name === 'TimeoutError' ? 'warning' : 'error'
		setResult(resultId, `→ ${error.name}`, type)
		log(`getPermission("${entry.name}") ✗ ${error.name}: ${error.message}`, type)
	}
}

function triggerNotifications(): void {
	if (typeof Notification !== 'undefined') {
		void Notification.requestPermission()
	} else {
		log('Notification API not supported — watcher will time out', 'warning')
	}
}

function triggerGeolocation(): void {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(noop, noop)
	} else {
		log('Geolocation API not supported — watcher will time out', 'warning')
	}
}

async function handleGetUserMediaStream(
	permissionName: PermissionName,
	constraints: MediaStreamConstraints
): Promise<void> {
	stopActiveStream()
	activeController = new AbortController()

	setResult('stream-result', `acquiring ${permissionName} stream…`, 'pending')
	log(`getUserMediaStream("${permissionName}") →`, 'pending')

	try {
		activeStream = await getUserMediaStream(permissionName, constraints, { signal: activeController.signal })

		const tracks = activeStream.getTracks()
		const kind = tracks[0]?.kind ?? 'unknown'
		const label = `MediaStream — ${tracks.length} ${kind} track${tracks.length !== 1 ? 's' : ''} (id: ${activeStream.id.slice(0, 8)}…)`

		setResult('stream-result', `→ ${label}`, 'success')
		log(`getUserMediaStream("${permissionName}") → ${label}`, 'success')
	} catch (err) {
		const error = err as DOMException
		if (error.name === 'AbortError') {
			setResult('stream-result', '→ aborted', 'warning')
			log(`getUserMediaStream("${permissionName}") — aborted`, 'warning')
		} else {
			setResult('stream-result', `→ ${error.name}: ${error.message}`, 'error')
			log(`getUserMediaStream("${permissionName}") ✗ ${error.name}: ${error.message}`, 'error')
		}
	} finally {
		activeController = null
	}
}

function handleAbort(): void {
	if (activeController) {
		activeController.abort()
	} else {
		stopActiveStream()
		setResult('stream-result', '→ no active stream', 'pending')
		log('abort — no active operation', 'warning')
	}
}

function stopActiveStream(): void {
	if (activeStream) {
		activeStream.getTracks().forEach((t) => t.stop())
		activeStream = null
	}
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
