import type { Mock } from 'vitest'

export const flushMicrotasks = (): Promise<void> => Promise.resolve()

export interface MockPermissionStatus {
	state: PermissionState
	addEventListener: Mock
	removeEventListener: Mock
}

export type StatusChangeListener = (event: { target: { state: PermissionState } }) => void

export const setupPermissionsMock = (mockQuery: Mock): void => {
	globalThis.PermissionStatus = vi.fn(function () {
		return { state: 'granted', addEventListener: vi.fn(), removeEventListener: vi.fn() }
	}) as unknown as typeof PermissionStatus
	globalThis.Permissions = vi.fn(function () {
		return { query: mockQuery }
	}) as unknown as typeof Permissions
	;(globalThis.navigator as { permissions?: Permissions }).permissions = new Permissions()
}

export const teardownPermissionsMock = (): void => {
	;(globalThis as { PermissionStatus?: typeof PermissionStatus }).PermissionStatus = undefined
	;(globalThis as { Permissions?: typeof Permissions }).Permissions = undefined
	;(globalThis.navigator as { permissions?: Permissions }).permissions = undefined
}

export const setupMediaDevicesMock = (mockGetUserMedia: Mock): void => {
	globalThis.MediaDevices = vi.fn(function () {
		return { getUserMedia: mockGetUserMedia }
	}) as unknown as typeof MediaDevices
	;(globalThis.navigator as { mediaDevices?: MediaDevices }).mediaDevices = new MediaDevices()
}

export const teardownMediaDevicesMock = (): void => {
	;(globalThis as { MediaDevices?: typeof MediaDevices }).MediaDevices = undefined
	;(globalThis.navigator as { mediaDevices?: MediaDevices }).mediaDevices = undefined
}

export const teardownPermissionsAndMediaDevicesMock = (): void => {
	teardownPermissionsMock()
	teardownMediaDevicesMock()
}
