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
	},
	{
		// These config files are CommonJS and run in Node, unlike the rest of
		// the repo (browser ESM). The vite configs are ESM, so we target the
		// CommonJS ones by name rather than a blanket `*.config.js` override.
		files: ['eslint.config.js', 'commitlint.config.js'],
		languageOptions: {
			globals: globals.node,
			sourceType: 'commonjs',
		},
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	}
)
