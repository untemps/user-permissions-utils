import getPermission, { type GetPermissionOptions } from './getPermission'

/**
 * Watches the `push` permission, resolving with `'granted'`. **Passive** wrapper around
 * {@link getPermission}: it never prompts, because `push` needs consumer infrastructure the library
 * can't synthesize (a service worker + VAPID key). Trigger via `pushManager.subscribe(...)` and
 * bound the `'prompt'` wait with `signal` and/or `timeout`.
 *
 * Queries `push` with `userVisibleOnly: true` because Chromium rejects the descriptor otherwise
 * (silent push is not allowed). On browsers that can't query `push` at all (Firefox/Safari), the
 * underlying `TypeError` is normalized to a `NotSupportedError` `DOMException` by {@link getPermission}.
 */
const getPushPermission = (options?: GetPermissionOptions): Promise<'granted'> =>
	getPermission({ name: 'push', userVisibleOnly: true }, options)

export default getPushPermission
