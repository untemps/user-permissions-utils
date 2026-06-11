import getPermission, { asPermissionName, type GetPermissionOptions } from './getPermission'

/**
 * Watches the `clipboard-write` permission, resolving with `'granted'`. **Passive** wrapper around
 * {@link getPermission}: it never prompts, because the only trigger is actually overwriting the
 * clipboard — a side effect the library won't perform. Trigger via `navigator.clipboard.write()`
 * and bound the `'prompt'` wait with `signal` and/or `timeout`.
 */
const getClipboardWritePermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	getPermission(asPermissionName('clipboard-write'), options)

export default getClipboardWritePermission
