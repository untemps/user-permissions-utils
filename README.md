# @untemps/user-permissions-utils

> Tiny, typed wrappers around the browser `navigator.permissions` and `navigator.mediaDevices` APIs — read a permission state, watch it, wait for a grant, or surface the prompt, without reaching for the raw browser API.

![npm](https://img.shields.io/npm/v/@untemps/user-permissions-utils?style=for-the-badge)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/untemps/user-permissions-utils/publish.yml?style=for-the-badge)](https://github.com/untemps/user-permissions-utils/actions)
![Codecov](https://img.shields.io/codecov/c/github/untemps/user-permissions-utils?style=for-the-badge)

## Installation

```bash
yarn add @untemps/user-permissions-utils
```

## Quick start

```javascript
import { checkPermission, getUserMediaStream } from '@untemps/user-permissions-utils'

// Read the current state without prompting the user
const state = await checkPermission('camera') // 'granted' | 'denied' | 'prompt'

// Surface the prompt and get the resulting stream once granted
const stream = await getUserMediaStream('camera', { video: true })
document.querySelector('video').srcObject = stream
```

## API at a glance

Two families of functions: those that only **observe** a permission state (they never surface a dialog) and those that **request** one (they surface the browser prompt). See [Concepts](#concepts) for the mental model.

**Inspect the current state** — read only, never prompts:

| Function                              | What it does                   |
| ------------------------------------- | ------------------------------ |
| [`checkPermission`](#checkpermission) | Read the current state once    |
| [`watchPermission`](#watchpermission) | Observe the state continuously |

**Wait for a grant** — never prompts; something else must trigger the real request:

| Function                                                          | Permission name     |
| ----------------------------------------------------------------- | ------------------- |
| [`getPermission`](#getpermission)                                 | _any_               |
| [`getPushPermission`](#passive-getters-push--clipboard)           | `'push'`            |
| [`getClipboardReadPermission`](#passive-getters-push--clipboard)  | `'clipboard-read'`  |
| [`getClipboardWritePermission`](#passive-getters-push--clipboard) | `'clipboard-write'` |

**Request a permission** — surfaces the prompt, then resolves once granted:

| Function                                            | Permission name        |
| --------------------------------------------------- | ---------------------- |
| [`getCameraPermission`](#active-getters)            | `'camera'`             |
| [`getMicrophonePermission`](#active-getters)        | `'microphone'`         |
| [`getGeolocationPermission`](#active-getters)       | `'geolocation'`        |
| [`getNotificationsPermission`](#active-getters)     | `'notifications'`      |
| [`getMidiPermission`](#active-getters)              | `'midi'`               |
| [`getPersistentStoragePermission`](#active-getters) | `'persistent-storage'` |
| [`getScreenWakeLockPermission`](#active-getters)    | `'screen-wake-lock'`   |
| [`getStorageAccessPermission`](#active-getters)     | `'storage-access'`     |

**Acquire a media stream** — requests camera/microphone and returns the `MediaStream`:

| Function                                    | What it does                                          |
| ------------------------------------------- | ----------------------------------------------------- |
| [`getUserMediaStream`](#getusermediastream) | Surface the prompt and resolve with the `MediaStream` |

## Concepts

Read this once and the API reference is mostly self-explanatory.

### Passive vs active

- **Passive** functions only _observe_ the state through `navigator.permissions.query()` and its `change` event. They **never surface a dialog**. `checkPermission`, `watchPermission`, `getPermission`, and the `push` / `clipboard` getters are all passive.
- **Active** functions _request_ a permission: they read the state and, on `'prompt'`, fire the matching native API (`getUserMedia`, `geolocation.getCurrentPosition`, `Notification.requestPermission`, …) — which is what surfaces the real browser dialog. The dedicated camera/microphone/geolocation/… getters and `getUserMediaStream` are active.

Some getters _can't_ be active: triggering a prompt from a permission name alone would require consumer-owned infrastructure (`push` needs a service worker and a VAPID key) or a privacy-sensitive side effect (the only way to prompt `clipboard-read` is to read the user's clipboard). Those stay passive — you trigger the real request yourself, then let the getter resolve.

Conversely, a few **active getters resolve without ever showing a dialog**: `persistent-storage`, `midi`, `screen-wake-lock` and `storage-access` are granted heuristically or by policy rather than through an explicit prompt. They still fire their native API and resolve with `'granted'` all the same.

### The bounded-wait contract

`query()` never transitions a `'prompt'` state on its own — it only reports it. So a passive wait on `'prompt'` would hang forever unless something else triggers the real request.

- **Passive** (`getPermission`, `push` / `clipboard` getters): on `'prompt'` you **must** pass a `timeout` (rejects with a `TimeoutError`), a `signal`, or both. Provide neither and the promise rejects immediately with an `InvalidStateError` instead of hanging forever.
- **Active** (dedicated getters, `getUserMediaStream`): the native prompt they surface settles the wait when the user responds, so `signal` / `timeout` are **optional**. Still pass a `timeout` for unattended flows — if the user neither accepts nor dismisses, the wait lasts as long as the prompt does.

`signal` / `timeout` bound the _wait_, not the prompt. Aborting or timing out rejects the returned promise, but the browser can't cancel a dialog it already surfaced: the prompt stays open and a late grant shows up only in the live state (read it via `checkPermission`), not in the rejected promise. The exception is `getCameraPermission` / `getMicrophonePermission` / `getUserMediaStream`, which forward the signal and tear down any stream that resolves after the abort, so the camera/microphone is never left active.

### Errors and feature detection

There are **no `is…Supported` helpers**. Every function throws a `NotSupportedError` `DOMException` when the API it relies on is unavailable: the Permissions API (every function _except_ `getUserMediaStream`), MediaDevices (`getUserMediaStream`), or — for active getters — the native trigger API (e.g. `getMidiPermission` when `navigator.requestMIDIAccess` is missing). **Every getter is guaranteed to reject with a `DOMException`**; even a missing trigger API is normalized rather than leaking a raw `TypeError`.

`getUserMediaStream` is the exception: it requires only MediaDevices and treats the Permissions API as **best-effort**. The query only lets it short-circuit a _previously denied_ permission; it isn't required to acquire a stream. On browsers that expose `navigator.mediaDevices.getUserMedia` but not `navigator.permissions` (e.g. older Safari), it skips the query and goes straight to `getUserMedia`.

To probe support upfront, call `checkPermission(name)` and catch: it rejects when the Permissions API is unsupported and propagates `query()` errors (e.g. an unrecognized permission name). `checkPermission` is the only function that surfaces the raw `query()` error — every other one normalizes it.

### Permission name or descriptor

`getPermission`, `checkPermission` and `watchPermission` accept either a permission **name** string or a full **`PermissionQueryDescriptor`**. The descriptor form lets you read permissions that need extra query members — notably `push`, which Chromium only queries with `userVisibleOnly: true` (silent push isn't allowed):

```javascript
await checkPermission({ name: 'push', userVisibleOnly: true })
```

`clipboard-read` and `clipboard-write` are valid permission names at runtime but aren't yet part of the DOM `PermissionName` type, so those two wrappers assert the name internally.

### Cross-browser fallthrough

Some browsers support a device but reject `navigator.permissions.query()` for its name with a `TypeError` (e.g. Firefox / Safari for `camera`, `microphone`, `midi`).

- **Active** getters and `getUserMediaStream` catch the `TypeError` and surface the prompt through the native API anyway (`getUserMedia`, `requestMIDIAccess`, …), so they work cross-browser.
- **Passive** getters have no native trigger to fall back on, so they **normalize** the `TypeError` to a `NotSupportedError` `DOMException`, preserving the "always a `DOMException`" guarantee. (`getPushPermission` does the same when `push` can't be queried at all.)
- **`checkPermission`** reports the raw state, so it propagates the original `query()` error for callers to inspect.

## API reference

### Inspect the current state

#### `checkPermission`

Resolves immediately with the current permission state (`'granted'`, `'denied'` or `'prompt'`). Unlike `getPermission`, it never waits for user interaction and never rejects on `'denied'`. It rejects when the Permissions API is unsupported, and otherwise propagates any error from `navigator.permissions.query()` (e.g. an unrecognized permission name). Useful to read the current state upfront — show a banner, disable a button, branch UI logic — without triggering a prompt.

Accepts a permission name or a full `PermissionQueryDescriptor` (see [Permission name or descriptor](#permission-name-or-descriptor)).

```javascript
import { checkPermission } from '@untemps/user-permissions-utils'

const init = async () => {
	try {
		const state = await checkPermission('microphone') // 'granted' | 'denied' | 'prompt'
		if (state === 'granted') {
			// permission already available — start straight away
		} else if (state === 'prompt') {
			// show a button that calls getPermission/getUserMediaStream on click
		}
	} catch (error) {
		// Thrown when the Permissions API is unsupported or the query fails
		console.error(error)
	}
}

// Permissions that need extra query members use the descriptor form:
const pushState = await checkPermission({ name: 'push', userVisibleOnly: true })
```

#### `watchPermission`

Subscribes to a permission's live state and calls `onChange` on every transition. Where `checkPermission` reads the state **once** and `getPermission` waits a **single** time for `'granted'`, this is a **continuous observer** wrapping `navigator.permissions.query()` and its `change` event — so you never reach for the raw browser API. Like `query()`, it never displays a dialog; it only reports the state as it changes (e.g. once `getUserMediaStream` or an active getter surfaces the real prompt and the user responds).

By default it emits the current state immediately (so a single call replaces a `checkPermission` read followed by a manual subscription), then on every `change`. Pass `emitImmediately: false` to receive transitions only. Accepts a permission name or a full `PermissionQueryDescriptor` (see [Permission name or descriptor](#permission-name-or-descriptor)).

The subscription lives until the optional `signal` aborts, at which point the `change` listener is removed. Omit the `signal` for a watch that lasts the page's lifetime. If your `onChange` throws on the upfront emit, the returned promise rejects and the `change` listener is removed first, so a throwing emit never leaves a subscription behind.

```javascript
import { watchPermission } from '@untemps/user-permissions-utils'

const controller = new AbortController()

await watchPermission(
	'microphone',
	(state) => {
		// 'granted' | 'denied' | 'prompt' — keep a banner/button in sync
		updateUI(state)
	},
	{ signal: controller.signal }
)

// Stop watching (removes the underlying change listener)
controller.abort()
```

### Wait for a grant

#### `getPermission`

Watches a permission and resolves with `'granted'` once it is granted. It is a **passive** watcher built on `navigator.permissions.query()`, so **it never displays a permission dialog**: an already-`'granted'` state resolves right away, while a `'denied'` state rejects with a `NotAllowedError` `DOMException`.

When the state is `'prompt'`, `getPermission` waits for the `change` event — which only fires once _something else_ triggers the real request (e.g. `getUserMediaStream`, `geolocation.getCurrentPosition`) and the user responds. The wait must therefore be **bounded** (see [The bounded-wait contract](#the-bounded-wait-contract)): pass a `timeout`, a `signal`, or both.

To actually surface a permission dialog, use one of the [active getters](#active-getters) or [`getUserMediaStream`](#getusermediastream) — `getPermission` itself only observes the state.

```javascript
import { getPermission } from '@untemps/user-permissions-utils'

// Resolves immediately if already granted, otherwise waits up to 5s
await getPermission('microphone', { timeout: 5000 })
```

```javascript
import { getPermission } from '@untemps/user-permissions-utils'

const controller = new AbortController()

const init = async () => {
	try {
		await getPermission('microphone', { signal: controller.signal })
	} catch (error) {
		if (error.name === 'AbortError') return
		console.error(error)
	}
}

// Cancel while still waiting for the permission to be granted
controller.abort()
```

#### Passive getters (`push` & `clipboard`)

These getters only _watch_ the state (exactly like `getPermission`) and never surface a dialog, because the library can't trigger them from a permission name alone (see [Passive vs active](#passive-vs-active)). The [bounded-wait](#the-bounded-wait-contract) requirement on `'prompt'` therefore applies — pass `signal` and/or `timeout`. All forward the same `{ signal?, timeout? }` options and resolve with `'granted'`.

| Function                      | Permission name     | Why it stays passive                                        |
| ----------------------------- | ------------------- | ----------------------------------------------------------- |
| `getPushPermission`           | `'push'`            | needs a registered service worker and a VAPID key           |
| `getClipboardReadPermission`  | `'clipboard-read'`  | the only way to prompt is to read the user's clipboard      |
| `getClipboardWritePermission` | `'clipboard-write'` | the only way to prompt is to overwrite the user's clipboard |

Trigger the real request yourself (e.g. `registration.pushManager.subscribe(...)`, `navigator.clipboard.read()`), then let the passive getter resolve. `getPushPermission` queries `push` with `userVisibleOnly: true`, as Chromium requires.

### Request a permission

#### Active getters

For permissions with a fixed name, these wrappers spare you from typing (and mistyping) the permission string — and surface the prompt for you, so you never reach for the native browser API. Each reads the current state and, on `'prompt'`, fires the matching native API to acquire the permission, resolving once granted (or rejecting on denial / timeout / abort). All forward the same `{ signal?, timeout? }` options and resolve with `'granted'`.

| Function                         | Permission name        | Acquired via                                    |
| -------------------------------- | ---------------------- | ----------------------------------------------- |
| `getCameraPermission`            | `'camera'`             | `getUserMediaStream`                            |
| `getMicrophonePermission`        | `'microphone'`         | `getUserMediaStream`                            |
| `getGeolocationPermission`       | `'geolocation'`        | `navigator.geolocation.getCurrentPosition`      |
| `getNotificationsPermission`     | `'notifications'`      | `Notification.requestPermission`                |
| `getMidiPermission`              | `'midi'`               | `navigator.requestMIDIAccess({ sysex: false })` |
| `getPersistentStoragePermission` | `'persistent-storage'` | `navigator.storage.persist`                     |
| `getScreenWakeLockPermission`    | `'screen-wake-lock'`   | `navigator.wakeLock.request('screen')`          |
| `getStorageAccessPermission`     | `'storage-access'`     | `document.requestStorageAccess`                 |

```javascript
import { getCameraPermission } from '@untemps/user-permissions-utils'

// Surfaces the camera prompt and resolves once granted (times out after 20s)
await getCameraPermission({ timeout: 20000 })
```

A few things to keep in mind, all detailed in [Concepts](#concepts):

- **Need the stream, not just the grant?** Use [`getUserMediaStream`](#getusermediastream) instead of `getCameraPermission` / `getMicrophonePermission`.
- **Some resolve without a dialog** (`persistent-storage`, `midi`, `screen-wake-lock`, `storage-access`) — see [Passive vs active](#passive-vs-active).
- **Pass a `timeout` for unattended flows** — `signal` / `timeout` stop the wait, not the prompt; see [The bounded-wait contract](#the-bounded-wait-contract).
- **They work cross-browser** by falling through to the native API on non-queryable names — see [Cross-browser fallthrough](#cross-browser-fallthrough).

### Acquire a media stream

#### `getUserMediaStream`

Resolves with a `MediaStream` once the permission is granted and the stream is retrieved. Accepts an optional `signal` to cancel the entire operation and an optional `timeout` (in milliseconds) that rejects with a `TimeoutError` once it elapses — the same bounded-wait ergonomics the active getters offer, handy for unattended flows. If the signal aborts or the timeout fires while acquisition is still in flight, a stream that resolves afterwards is torn down automatically (its tracks are stopped), so the camera or microphone is never left active.

It requires only MediaDevices and treats the Permissions API as best-effort (see [Errors and feature detection](#errors-and-feature-detection)). The `permissionName` and `mediaStreamConstraints` must match the same media device:

| `permissionName` | `mediaStreamConstraints` |
| ---------------- | ------------------------ |
| `'microphone'`   | `{ audio: true }`        |
| `'camera'`       | `{ video: true }`        |

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

// Microphone
const stream = await getUserMediaStream('microphone', { audio: true })
const audioContext = new AudioContext()
const streamNode = audioContext.createMediaStreamSource(stream)

// Camera
const videoStream = await getUserMediaStream('camera', { video: true })
document.querySelector('video').srcObject = videoStream
```

Cancel a pending acquisition (permission wait or stream retrieval) with a `signal`:

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

const controller = new AbortController()

const init = async () => {
	try {
		const stream = await getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
	} catch (error) {
		if (error.name === 'AbortError') return
		console.error(error)
	}
}

controller.abort()
```

Or time-box an unattended acquisition with a `timeout` (combinable with a `signal`):

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

const init = async () => {
	try {
		// Reject with a `TimeoutError` if the stream isn't acquired within 10s
		const stream = await getUserMediaStream('camera', { video: true }, { timeout: 10000 })
	} catch (error) {
		if (error.name === 'TimeoutError') return // no response in time — the camera is never left active
		console.error(error)
	}
}
```

## TypeScript

This package is written in TypeScript and ships its own type declarations — no extra `@types/...` package is required. The option types are exported for convenience:

```typescript
import {
	getPermission,
	getUserMediaStream,
	type GetPermissionOptions,
	type GetUserMediaStreamOptions,
	type WatchPermissionOptions,
	type PermissionQueryDescriptor,
} from '@untemps/user-permissions-utils'
```

`permissionName` is typed as the DOM `PermissionName` (e.g. `'microphone'`, `'camera'`) and `mediaStreamConstraints` as the DOM `MediaStreamConstraints`.

## Development

The development toolchain requires Node `>= 22.22.1` — a hard floor imposed by the pinned tooling (notably `lint-staged`, used by the pre-commit hook) — and targets Node 24, pinned via [`.nvmrc`](.nvmrc):

```bash
nvm use
yarn install
```

Consumers only need Node `>= 20`; the higher floor applies only to working on the project itself, so it lives in [`.nvmrc`](.nvmrc) rather than in `package.json`'s `engines` field (which states the runtime requirement for consumers).

To launch the interactive demo (Vite dev server) and exercise the utilities against real browser permission prompts:

```bash
yarn dev
```
