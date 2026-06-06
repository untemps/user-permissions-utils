const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')

module.exports = tseslint.config(
	{ ignores: ['dist/**', 'coverage/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: globals.browser,
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
	{
		files: ['src/__tests__/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.vitest,
			},
		},
	}
)
