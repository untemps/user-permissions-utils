# @untemps/user-permissions-utils

Collection of utility functions to manage user permissions.

![npm](https://img.shields.io/npm/v/@untemps/user-permissions-utils?style=for-the-badge)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/untemps/user-permissions-utils/publish.yml?style=for-the-badge)](https://github.com/untemps/user-permissions-utils/actions)
![Codecov](https://img.shields.io/codecov/c/github/untemps/user-permissions-utils?style=for-the-badge)

## Installation

```bash
yarn add @untemps/user-permissions-utils
```

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

`getUserMediaStream`:

Returns a promise resolved when the permission is granted and the stream is retrieved

```javascript
import { getUserMediaStream } from '@untemps/user-permissions-utils'

const init = async () => {
    try {
    	const stream = await getUserMediaStream('microphone', { audio: true })
    	if(!!stream) {
    	    const audioContext = new AudioContext()
    	    const streamNode = audioContext.createMediaStreamSource(stream)
            ...
    	} else {
    	    console.error('Stream is not available')
    	}
    } catch (error) {
        console.error(error)
    }
}
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
-   Add commitlint to ensure commit logs are valid
