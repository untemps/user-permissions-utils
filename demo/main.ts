import { isNavigatorPermissionsSupported, isNavigatorMediaDevicesSupported, getUserMediaStream } from '../src/index'

let activeController: AbortController | null = null
let activeStream: MediaStream | null = null

const WATCHED_PERMISSIONS: PermissionName[] = ['microphone', 'camera']
const STATE_DOT_CLASS: Record<string, string> = { granted: 'supported', denied: 'unsupported', prompt: 'prompt' }
const STATE_LOG_TYPE: Record<string, string> = { granted: 'success', denied: 'error', prompt: '' }
const logEl = document.getElementById('log')!

document.addEventListener('DOMContentLoaded', () => {
	initSupportStatus()
	initPermissionStates(WATCHED_PERMISSIONS)

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

function initPermissionStates(permissionNames: PermissionName[]): void {
	permissionNames.forEach(async (name) => {
		try {
			const status = await navigator.permissions.query({ name })
			renderPermissionState(name, status.state)
			status.addEventListener('change', () => {
				renderPermissionState(name, status.state)
				log(`permission "${name}" changed → ${status.state}`, STATE_LOG_TYPE[status.state])
			})
		} catch (err) {
			const error = err as DOMException
			renderPermissionState(name, 'error')
			log(`getPermission("${name}") ✗ ${error.name}: ${error.message}`, 'error')
		}
	})
}

function renderPermissionState(name: string, state: PermissionState | 'error'): void {
	const dot = document.getElementById(`dot-permission-${name}`)!
	const label = document.getElementById(`permission-${name}`)!
	dot.className = `dot ${STATE_DOT_CLASS[state]}`
	label.textContent = state
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
