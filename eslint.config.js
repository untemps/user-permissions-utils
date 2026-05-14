const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
	{ ignores: ['dist/**', 'coverage/**'] },
	js.configs.recommended,
	{
		languageOptions: {
			globals: globals.browser,
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
	{
		files: ['src/__tests__/**/*.js'],
		languageOptions: {
			globals: {
				...globals.node,
				vi: 'readonly',
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeAll: 'readonly',
				beforeEach: 'readonly',
				afterAll: 'readonly',
			},
		},
	},
]
