import getPermission, { type GetPermissionOptions } from './getPermission'

/**
 * Watches the `push` permission, resolving with `'granted'`. **Passive** wrapper around
 * {@link getPermission}: it never prompts, because `push` needs consumer infrastructure the library
 * can't synthesize (a service worker + VAPID key). Trigger via `pushManager.subscribe(...)` and
 * bound the `'prompt'` wait with `signal` and/or `timeout`.
 */
const getPushPermission = (options?: GetPermissionOptions): Promise<'granted'> => getPermission('push', options)

export default getPushPermission
