import type { Mock } from 'vitest'

export const flushMicrotasks = (): Promise<void> => Promise.resolve()

// A real `EventTarget` (so `addEventListener` / `removeEventListener` / `dispatchEvent`
// behave like the browser) carrying a mutable `state`. Prompt tests drive the genuine
// async path by mutating `state` then dispatching a `change` event, rather than firing a
// listener synchronously from inside a mocked `addEventListener`.
export interface MockPermissionStatus extends EventTarget {
	state: PermissionState
}

// Save/restore originals so the suite never leaks mutated globals between blocks.
// Each `stubProperty` is paired with a matching `restoreProperty` (in an `afterAll`),
// so we capture the current value before overwriting it and reinstate it on teardown —
// restoring the real ambient value (often "not implemented") instead of forcing
// `undefined`, which is what made the suite order-dependent.
const restorers: Record<string, () => void> = {}

const stubProperty = (target: object, key: string, value: unknown): void => {
	const original = (target as Record<string, unknown>)[key]
	restorers[key] = () => {
		;(target as Record<string, unknown>)[key] = original
	}
	;(target as Record<string, unknown>)[key] = value
}

const restoreProperty = (key: string): void => {
	restorers[key]()
	delete restorers[key]
}

export const setNavigatorApiUnsupported = (api: 'permissions' | 'mediaDevices'): void => {
	stubProperty(globalThis.navigator, api, undefined)
}

export const restoreNavigatorApi = (api: 'permissions' | 'mediaDevices'): void => {
	restoreProperty(api)
}

export const setupPermissionsMock = (mockQuery: Mock): void => {
	stubProperty(
		globalThis,
		'PermissionStatus',
		class extends EventTarget {
			state: PermissionState = 'granted'
		}
	)
	stubProperty(
		globalThis,
		'Permissions',
		vi.fn(function () {
			return { query: mockQuery }
		})
	)
	stubProperty(globalThis.navigator, 'permissions', new Permissions())
}

export const teardownPermissionsMock = (): void => {
	restoreProperty('permissions')
	restoreProperty('Permissions')
	restoreProperty('PermissionStatus')
}

export const setupMediaDevicesMock = (mockGetUserMedia: Mock): void => {
	stubProperty(
		globalThis,
		'MediaDevices',
		vi.fn(function () {
			return { getUserMedia: mockGetUserMedia }
		})
	)
	stubProperty(globalThis.navigator, 'mediaDevices', new MediaDevices())
}

export const teardownMediaDevicesMock = (): void => {
	restoreProperty('mediaDevices')
	restoreProperty('MediaDevices')
}

export const teardownPermissionsAndMediaDevicesMock = (): void => {
	teardownPermissionsMock()
	teardownMediaDevicesMock()
}
