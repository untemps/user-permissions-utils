import isPermissionsSupported from '../isPermissionsSupported'

// The predicate reads `globalThis.navigator` wholesale (including the SSR case where `navigator`
// itself is undefined), so we stub the whole property rather than just `navigator.permissions`.
// Capture the real descriptor once and reinstate it after every test to avoid leaking globals.
describe('isPermissionsSupported', () => {
	const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

	const stubNavigator = (value: unknown): void => {
		Object.defineProperty(globalThis, 'navigator', { value, configurable: true })
	}

	afterEach(() => {
		if (originalNavigator) {
			Object.defineProperty(globalThis, 'navigator', originalNavigator)
		}
	})

	it('returns true when permissions and query are present', () => {
		stubNavigator({ permissions: { query: () => {} } })
		expect(isPermissionsSupported()).toBe(true)
	})

	it('returns false when navigator.permissions is absent', () => {
		stubNavigator({})
		expect(isPermissionsSupported()).toBe(false)
	})

	it('returns false when permissions is present but query is absent', () => {
		stubNavigator({ permissions: {} })
		expect(isPermissionsSupported()).toBe(false)
	})

	it('returns false without throwing when navigator is undefined (SSR)', () => {
		stubNavigator(undefined)
		expect(() => isPermissionsSupported()).not.toThrow()
		expect(isPermissionsSupported()).toBe(false)
	})
})
