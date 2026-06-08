import getPermission, { type GetPermissionOptions } from './getPermission'

/**
 * Watches the `clipboard-write` permission and resolves with `'granted'` once it is granted.
 *
 * Thin wrapper around {@link getPermission} with the permission name hardcoded — see
 * `getPermission` for the full passive-watcher contract (bounded wait on `'prompt'`).
 *
 * @param options           Optional settings forwarded to `getPermission`
 * @param options.signal    Optional AbortSignal to cancel the pending wait
 * @param options.timeout   Optional timeout in milliseconds
 * @returns A promise resolved with `'granted'`
 */
const getClipboardWritePermission = async (options?: GetPermissionOptions): Promise<'granted'> =>
	// `clipboard-write` is a valid permission name at runtime but is not (yet) part of the DOM
	// lib's `PermissionName` union, so the literal is asserted to satisfy `getPermission`.
	getPermission('clipboard-write' as PermissionName, options)

export default getClipboardWritePermission
