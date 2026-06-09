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
import { getPermission, getUserMediaStream, type GetPermissionOptions, type GetUserMediaStreamOptions } from '@untemps/user-permissions-utils'
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

| Function | Permission name | Prompt surfaced via |
|---|---|---|
| `getCameraPermission` | `'camera'` | `getUserMediaStream` |
| `getMicrophonePermission` | `'microphone'` | `getUserMediaStream` |
| `getGeolocationPermission` | `'geolocation'` | `navigator.geolocation.getCurrentPosition` |
| `getNotificationsPermission` | `'notifications'` | `Notification.requestPermission` |
| `getMidiPermission` | `'midi'` | `navigator.requestMIDIAccess({ sysex: false })` |
| `getPersistentStoragePermission` | `'persistent-storage'` | `navigator.storage.persist` |
| `getScreenWakeLockPermission` | `'screen-wake-lock'` | `navigator.wakeLock.request('screen')` |
| `getStorageAccessPermission` | `'storage-access'` | `document.requestStorageAccess` |

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

**Passive getters** only _watch_ the state (exactly like `getPermission`) and never surface a dialog, because the library cannot trigger them from a permission name alone without consumer-owned infrastructure or a privacy-sensitive side effect. The **bounded-wait** requirement on `'prompt'` therefore applies (pass `signal` and/or `timeout`):

| Function | Permission name | Why it stays passive |
|---|---|---|
| `getPushPermission` | `'push'` | needs a registered service worker and a VAPID key |
| `getClipboardReadPermission` | `'clipboard-read'` | the only way to prompt is to read the user's clipboard |
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

`getUserMediaStream`:

Returns a promise resolved when the permission is granted and the stream is retrieved. Accepts an optional `signal` to cancel the entire operation. If the signal aborts while acquisition is still in flight, a stream that resolves afterwards is torn down automatically (its tracks are stopped), so the camera or microphone is never left active.

The `permissionName` and `mediaStreamConstraints` must match the same media device:

| `permissionName` | `mediaStreamConstraints` |
|---|---|
| `'microphone'` | `{ audio: true }` |
| `'camera'` | `{ video: true }` |

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

> **Feature detection:** there are no `is…Supported` helpers. Every function throws a `NOT_SUPPORTED_ERR` `DOMException` when the Permissions API (or, for `getUserMediaStream`, MediaDevices) is unavailable. To probe support upfront, call `checkPermission(name)` and catch — it rejects when the Permissions API is unsupported and propagates `navigator.permissions.query()` errors (e.g. an unrecognized permission name).

## Development

The development toolchain targets Node 24, pinned via [`.nvmrc`](.nvmrc):

```bash
nvm use
yarn install
```

Consumers only need Node `>= 20` (see [Installation](#installation)); the higher floor is for working on the project itself.

To launch the interactive demo (Vite dev server) and exercise the utilities against real browser permission prompts:

```bash
yarn dev
```

## Todos

-   Extend the dedicated permission getters to sensor/device permissions (`accelerometer`, `bluetooth`, `gyroscope`, `magnetometer`, …) once they land in the DOM `PermissionName` type
