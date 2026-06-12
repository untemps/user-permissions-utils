# @untemps/user-permissions-utils

Collection of utility functions to manage user permissions.

![npm](https://img.shields.io/npm/v/@untemps/user-permissions-utils?style=for-the-badge)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/untemps/user-permissions-utils/publish.yml?style=for-the-badge)](https://github.com/untemps/user-permissions-utils/actions)
![Codecov](https://img.shields.io/codecov/c/github/untemps/user-permissions-utils?style=for-the-badge)

## Installation

```bash
yarn add @untemps/user-permissions-utils
```

**Requirements:** Node.js `>= 20`.

## TypeScript

This package is written in TypeScript and ships its own type declarations — no extra `@types/...` package is required. The option types are exported for convenience:

```typescript
import {
	getPermission,
	getUserMediaStream,
	type GetPermissionOptions,
	type GetUserMediaStreamOptions,
} from '@untemps/user-permissions-utils'
```

`permissionName` is typed as the DOM `PermissionName` (e.g. `'microphone'`, `'camera'`) and `mediaStreamConstraints` as the DOM `MediaStreamConstraints`.

## Utils

`getPermission`:

Watches a permission and resolves with `'granted'` once it is granted. It is a **passive** watcher built on `navigator.permissions.query()`, so **it never displays a permission dialog**: an already-`'granted'` state resolves right away, while a `'denied'` state rejects with a `NOT_ALLOWED_ERR` `DOMException`.

When the state is `'prompt'`, `getPermission` waits for the `change` event — which only fires once _something else_ triggers the real request (e.g. `getUserMediaStream`, `geolocation.getCurrentPosition`) and the user responds. Since nothing transitions a `'prompt'` state on its own, **the wait must be bounded**: pass a `timeout` (rejects with a `TimeoutError` once elapsed), a `signal`, or both. If you provide neither while the state is `'prompt'`, the promise rejects immediately with an `InvalidStateError` instead of hanging forever.

To actually surface a permission dialog, use one of the **active** dedicated getters below (e.g. `getCameraPermission`, `getGeolocationPermission`) or `getUserMediaStream` — `getPermission` itself only observes the state.

```javascript
import { getPermission } from '@untemps/user-permissions-utils'

const init = async () => {
    try {
        // Resolves immediately if already granted, otherwise waits up to 5s
        await getPermission('microphone', { timeout: 5000 })
        ...
    } catch (error) {
        console.error(error)
    }
}
```

To cancel a pending permission wait:

```javascript
import { getPermission } from '@untemps/user-permissions-utils'

const controller = new AbortController()

const init = async () => {
    try {
        await getPermission('microphone', { signal: controller.signal })
        ...
    } catch (error) {
        if (error.name === 'AbortError') return
        console.error(error)
    }
}

// Cancel while still waiting for the permission to be granted
controller.abort()
```

**Dedicated permission getters:**

For permissions with a fixed name, dedicated wrappers spare you from typing (and mistyping) the permission string — and, for most of them, surface the prompt for you so you never reach for the native browser API. All forward the same `{ signal?, timeout? }` options and resolve with `'granted'`.

**Active getters** read the current state and, on `'prompt'`, fire the matching native API to surface the real dialog, resolving once granted (or rejecting on denial / timeout / abort):

| Function                         | Permission name        | Prompt surfaced via                             |
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

const init = async () => {
    try {
        // Surfaces the camera prompt and resolves once granted (times out after 20s)
        await getCameraPermission({ timeout: 20000 })
        ...
    } catch (error) {
        console.error(error)
    }
}
```

> Use `getUserMediaStream` instead of `getCameraPermission` / `getMicrophonePermission` when you need the resulting `MediaStream` rather than just the grant.

> **`signal` / `timeout` on the active getters stop the _wait_, not the native prompt.** Aborting or timing out rejects the returned promise, but the browser cannot cancel a dialog it already surfaced: the prompt stays open and a late grant is reflected only in the live permission state (e.g. via `checkPermission`), not in the rejected promise. The one exception is `getCameraPermission` / `getMicrophonePermission`, which forward the signal into `getUserMediaStream` and tear the acquired stream down so the camera/microphone is never left active.

> **Pass a `timeout` for unattended flows.** Unlike the passive getters (and `getPermission`), the active getters don't require `signal`/`timeout` on `'prompt'` — the native prompt they surface settles the wait when the user responds. But if the user neither accepts nor dismisses, the wait lasts as long as the prompt does. Add a `timeout` (and/or `signal`) whenever you can't rely on a timely response.

> **Non-queryable permission names fall through to the native API.** Some browsers support a device but reject `navigator.permissions.query()` for its name with a `TypeError` (e.g. Firefox / Safari for `camera`, `microphone`, `midi`). The active getters and `getUserMediaStream` catch that and surface the prompt through the native API anyway (`getUserMedia`, `requestMIDIAccess`, …) instead of failing, so they work cross-browser. The passive getters and `checkPermission` have no native trigger to fall back on, so they still propagate the `query()` error.

**Passive getters** only _watch_ the state (exactly like `getPermission`) and never surface a dialog, because the library cannot trigger them from a permission name alone without consumer-owned infrastructure or a privacy-sensitive side effect. The **bounded-wait** requirement on `'prompt'` therefore applies (pass `signal` and/or `timeout`):

| Function                      | Permission name     | Why it stays passive                                        |
| ----------------------------- | ------------------- | ----------------------------------------------------------- |
| `getPushPermission`           | `'push'`            | needs a registered service worker and a VAPID key           |
| `getClipboardReadPermission`  | `'clipboard-read'`  | the only way to prompt is to read the user's clipboard      |
| `getClipboardWritePermission` | `'clipboard-write'` | the only way to prompt is to overwrite the user's clipboard |

Trigger those yourself (e.g. `registration.pushManager.subscribe(...)`, `navigator.clipboard.read()`), then let the passive getter resolve.

> `clipboard-read` and `clipboard-write` are valid permission names at runtime but are not (yet) part of the DOM `PermissionName` type, so those two wrappers assert the name internally.

`checkPermission`:

Returns a promise resolved with the current permission state (`'granted'`, `'denied'` or `'prompt'`) immediately. Unlike `getPermission`, it never waits for user interaction and never rejects on `'denied'`. It rejects when the Permissions API is unsupported, and otherwise propagates any error from `navigator.permissions.query()` (e.g. an unrecognized permission name). Useful to read the current state upfront (show a permission banner, disable a button, branch UI logic) without triggering a prompt.

```javascript
import { checkPermission } from '@untemps/user-permissions-utils'

const init = async () => {
    try {
        const state = await checkPermission('microphone') // 'granted' | 'denied' | 'prompt'
        if (state === 'granted') {
            // permission already available — start straight away
            ...
        } else if (state === 'prompt') {
            // show a button that calls getPermission/getUserMediaStream on click
            ...
        }
    } catch (error) {
        // Thrown when the Permissions API is unsupported or the query fails
        console.error(error)
    }
}
```

`watchPermission`:

Subscribes to a permission's live state and calls `onChange` on every transition. Where `checkPermission` reads the state **once** and `getPermission` waits a **single** time for `'granted'`, this is a **continuous observer**: it wraps `navigator.permissions.query()` and its `change` event, so you never reach for the raw browser API. Like `query()`, it never displays a dialog — it only reports the state as it changes (e.g. once `getUserMediaStream` or a dedicated getter surfaces the real prompt and the user responds).

By default it emits the current state immediately (so a single call replaces a `checkPermission` read followed by a manual subscription), then on every `change`. Pass `emitImmediately: false` to receive transitions only.

```javascript
import { watchPermission } from '@untemps/user-permissions-utils'

const init = async () => {
	try {
		await watchPermission('microphone', (state) => {
			// 'granted' | 'denied' | 'prompt' — keep a banner/button in sync
			updateUI(state)
		})
	} catch (error) {
		// Thrown when the Permissions API is unsupported or the query fails
		console.error(error)
	}
}
```

The subscription lives until the optional `signal` aborts, at which point the `change` listener is removed. Omit the `signal` for a watch that lasts the page's lifetime. If your `onChange` throws on the upfront emit, the returned promise rejects and the `change` listener is removed first, so a throwing emit never leaves a subscription behind.

```javascript
import { watchPermission } from '@untemps/user-permissions-utils'

const controller = new AbortController()

await watchPermission('microphone', (state) => updateUI(state), { signal: controller.signal })

// Stop watching (removes the underlying change listener)
controller.abort()
```

`getUserMediaStream`:

Returns a promise resolved when the permission is granted and the stream is retrieved. Accepts an optional `signal` to cancel the entire operation. If the signal aborts while acquisition is still in flight, a stream that resolves afterwards is torn down automatically (its tracks are stopped), so the camera or microphone is never left active.

The `permissionName` and `mediaStreamConstraints` must match the same media device:

| `permissionName` | `mediaStreamConstraints` |
| ---------------- | ------------------------ |
| `'microphone'`   | `{ audio: true }`        |
| `'camera'`       | `{ video: true }`        |

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

// Microphone
const init = async () => {
    try {
        const stream = await getUserMediaStream('microphone', { audio: true })
        const audioContext = new AudioContext()
        const streamNode = audioContext.createMediaStreamSource(stream)
        ...
    } catch (error) {
        console.error(error)
    }
}

// Camera
const initCamera = async () => {
    try {
        const stream = await getUserMediaStream('camera', { video: true })
        const videoElement = document.querySelector('video')
        videoElement.srcObject = stream
        ...
    } catch (error) {
        console.error(error)
    }
}
```

To cancel a pending stream acquisition:

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

const controller = new AbortController()

const init = async () => {
    try {
        const stream = await getUserMediaStream('microphone', { audio: true }, { signal: controller.signal })
        ...
    } catch (error) {
        if (error.name === 'AbortError') return
        console.error(error)
    }
}

// Cancel the operation at any point (permission wait or stream acquisition)
controller.abort()
```

> **Feature detection:** there are no `is…Supported` helpers. Every function throws a `NOT_SUPPORTED_ERR` `DOMException` when the API it relies on is unavailable — the Permissions API (all functions), MediaDevices (`getUserMediaStream`), and, for the active getters, the native API they use to surface the prompt (e.g. `getMidiPermission` when `navigator.requestMIDIAccess` is missing). That last case is normalized too, so a missing trigger API never leaks a raw `TypeError`. To probe support upfront, call `checkPermission(name)` and catch — it rejects when the Permissions API is unsupported and propagates `navigator.permissions.query()` errors (e.g. an unrecognized permission name).

## Development

The development toolchain requires Node `>= 22.22.1` — a hard floor imposed by the pinned tooling (notably `lint-staged`, used by the pre-commit hook) — and targets Node 24, pinned via [`.nvmrc`](.nvmrc):

```bash
nvm use
yarn install
```

Consumers only need Node `>= 20` (see [Installation](#installation)); the higher floor applies only to working on the project itself, so it lives in [`.nvmrc`](.nvmrc) rather than in `package.json`'s `engines` field (which states the runtime requirement for consumers).

To launch the interactive demo (Vite dev server) and exercise the utilities against real browser permission prompts:

```bash
yarn dev
```
