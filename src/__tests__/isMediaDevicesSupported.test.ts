import isMediaDevicesSupported from '../isMediaDevicesSupported'

// The predicate reads `globalThis.navigator` wholesale (including the SSR case where `navigator`
// itself is undefined), so we stub the whole property rather than just `navigator.mediaDevices`.
// Capture the real descriptor once and reinstate it after every test to avoid leaking globals.
describe('isMediaDevicesSupported', () => {
	const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

	const stubNavigator = (value: unknown): void => {
		Object.defineProperty(globalThis, 'navigator', { value, configurable: true })
	}

	afterEach(() => {
		if (originalNavigator) {
			Object.defineProperty(globalThis, 'navigator', originalNavigator)
		}
	})

	it('returns true when mediaDevices and getUserMedia are present', () => {
		stubNavigator({ mediaDevices: { getUserMedia: () => {} } })
		expect(isMediaDevicesSupported()).toBe(true)
	})

	it('returns false when navigator.mediaDevices is absent', () => {
		stubNavigator({})
		expect(isMediaDevicesSupported()).toBe(false)
	})

	it('returns false when mediaDevices is present but getUserMedia is absent', () => {
		stubNavigator({ mediaDevices: {} })
		expect(isMediaDevicesSupported()).toBe(false)
	})

	it('returns false without throwing when navigator is undefined (SSR)', () => {
		stubNavigator(undefined)
		expect(() => isMediaDevicesSupported()).not.toThrow()
		expect(isMediaDevicesSupported()).toBe(false)
	})
})
