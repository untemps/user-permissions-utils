const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
	{ ignores: ['dist/**', 'coverage/**'] },
	js.configs.recommended,
	{
		languageOptions: {
			globals: globals.browser,
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
	{
		files: ['src/__tests__/**/*.js'],
		languageOptions: {
			globals: {
				...globals.vitest,
				global: 'readonly',
			},
		},
	},
]
