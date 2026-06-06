# @untemps/user-permissions-utils

Collection of utility functions to manage user permissions.

![npm](https://img.shields.io/npm/v/@untemps/user-permissions-utils?style=for-the-badge)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/untemps/user-permissions-utils/publish.yml?style=for-the-badge)](https://github.com/untemps/user-permissions-utils/actions)
![Codecov](https://img.shields.io/codecov/c/github/untemps/user-permissions-utils?style=for-the-badge)

## Installation

```bash
yarn add @untemps/user-permissions-utils
```

## TypeScript

This package is written in TypeScript and ships its own type declarations — no extra `@types/...` package is required. The option types are exported for convenience:

```typescript
import { getPermission, getUserMediaStream, type GetPermissionOptions, type GetUserMediaStreamOptions } from '@untemps/user-permissions-utils'
```

`permissionName` is typed as the DOM `PermissionName` (e.g. `'microphone'`, `'camera'`) and `mediaStreamConstraints` as the DOM `MediaStreamConstraints`.

## Utils

`getPermission`:

Returns a promise resolved when the permission is granted. Accepts an optional `signal` to cancel the pending wait.

```javascript
import { getPermission } from '@untemps/user-permissions-utils'

const init = async () => {
    try {
    	await getPermission('microphone')
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

// Cancel before the user responds to the permission dialog
controller.abort()
```

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

Returns a promise resolved when the permission is granted and the stream is retrieved. Accepts an optional `signal` to cancel the entire operation.

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

`isNavigatorPermissionsSupported`:

Returns `true` if the browser supports `navigator.permissions`

```javascript
import { isNavigatorPermissionsSupported } from '@untemps/user-permissions-utils'

if (!isNavigatorPermissionsSupported()) {
    console.warn('Navigator Permissions API is not supported in this browser')
}
```

`isNavigatorMediaDevicesSupported`:

Returns `true` if the browser supports `navigator.mediaDevices`

```javascript
import { isNavigatorMediaDevicesSupported } from '@untemps/user-permissions-utils'

if (!isNavigatorMediaDevicesSupported()) {
    console.warn('Navigator MediaDevices API is not supported in this browser')
}
```

## Todos

-   Add permissions-based API:
    -   clipboard
    -   geolocation
    -   notification
    -   ...
