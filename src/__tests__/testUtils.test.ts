import { setNavigatorApiUnsupported, restoreNavigatorApi } from './testUtils'

describe('testUtils', () => {
	describe('stubProperty guard', () => {
		it('throws when the same property is stubbed twice without restoring in between', () => {
			// First stub captures the real original; the second would capture the stubbed value
			// as the "original" and silently lose it, so it must fail loudly instead.
			setNavigatorApiUnsupported('permissions')
			try {
				expect(() => setNavigatorApiUnsupported('permissions')).toThrow(/already stubbed/)
			} finally {
				restoreNavigatorApi('permissions')
			}
		})

		it('allows stubbing again after the previous stub has been restored', () => {
			setNavigatorApiUnsupported('permissions')
			restoreNavigatorApi('permissions')
			expect(() => setNavigatorApiUnsupported('permissions')).not.toThrow()
			restoreNavigatorApi('permissions')
		})
	})
})
