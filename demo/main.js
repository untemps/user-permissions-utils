import { isNavigatorPermissionsSupported, isNavigatorMediaDevicesSupported, getUserMediaStream } from '../src/index.js'

let activeController = null
let activeStream = null

document.addEventListener('DOMContentLoaded', () => {
	initSupportStatus()

	document.querySelectorAll('[data-action="getPermission"]').forEach((btn) => {
		btn.addEventListener('click', () => handleGetPermission(btn.dataset.permission))
	})

	document.querySelectorAll('[data-action="getUserMediaStream"]').forEach((btn) => {
		btn.addEventListener('click', () =>
			handleGetUserMediaStream(btn.dataset.permission, JSON.parse(btn.dataset.constraints))
		)
	})

	document.getElementById('abort-btn').addEventListener('click', handleAbort)
})

function initSupportStatus() {
	const permissionsOk = isNavigatorPermissionsSupported()
	const mediaDevicesOk = isNavigatorMediaDevicesSupported()

	setSupport('permissions', permissionsOk)
	setSupport('mediadevices', mediaDevicesOk)
}

function setSupport(key, ok) {
	document.getElementById(`dot-${key}`).classList.add(ok ? 'supported' : 'unsupported')
	document.getElementById(`${key}-support`).textContent = ok ? 'supported' : 'not supported'
}

const permissionWatchers = {}

async function handleGetPermission(permissionName) {
	setResult('permission-result', `querying ${permissionName}…`, 'pending')

	try {
		const status = await navigator.permissions.query({ name: permissionName })

		showPermissionState(permissionName, status.state)

		if (permissionWatchers[permissionName]) {
			permissionWatchers[permissionName].removeEventListener('change', permissionWatchers[permissionName]._cb)
		}

		const onChange = () => showPermissionState(permissionName, status.state)
		status._cb = onChange
		status.addEventListener('change', onChange)
		permissionWatchers[permissionName] = status
	} catch (err) {
		setResult('permission-result', `→ ${err.name}: ${err.message}`, 'error')
		log(`getPermission("${permissionName}") ✗ ${err.name}: ${err.message}`, 'error')
	}
}

function showPermissionState(permissionName, state) {
	const type = state === 'granted' ? 'success' : state === 'denied' ? 'error' : 'warning'
	const suffix = state === 'prompt' ? ' — no prompt yet (grant via getUserMediaStream)' : ''
	setResult('permission-result', `→ ${state}${suffix}`, type)
	log(`getPermission("${permissionName}") → ${state}`, type)
}

async function handleGetUserMediaStream(permissionName, constraints) {
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
		if (err.name === 'AbortError') {
			setResult('stream-result', '→ aborted', 'warning')
			log(`getUserMediaStream("${permissionName}") — aborted`, 'warning')
		} else {
			setResult('stream-result', `→ ${err.name}: ${err.message}`, 'error')
			log(`getUserMediaStream("${permissionName}") ✗ ${err.name}: ${err.message}`, 'error')
		}
	} finally {
		activeController = null
	}
}

function handleAbort() {
	if (activeController) {
		activeController.abort()
	} else {
		stopActiveStream()
		setResult('stream-result', '→ no active stream', 'pending')
		log('abort — no active operation', 'warning')
	}
}

function stopActiveStream() {
	if (activeStream) {
		activeStream.getTracks().forEach((t) => t.stop())
		activeStream = null
	}
}

function setResult(id, text, type) {
	const el = document.getElementById(id)
	el.textContent = text
	el.className = `result result--${type}`
}

function log(message, type = '') {
	const logEl = document.getElementById('log')

	const empty = logEl.querySelector('.empty-log')
	if (empty) empty.remove()

	const time = new Date().toLocaleTimeString()
	const entry = document.createElement('div')
	entry.className = `log-entry${type ? ` ${type}` : ''}`
	entry.innerHTML = `<span class="time">${time}</span><span class="msg">${message}</span>`
	logEl.append(entry)
	logEl.scrollTop = logEl.scrollHeight
}
