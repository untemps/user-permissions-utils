import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.js',
			name: 'UserPermissionsUtils',
			formats: ['cjs', 'es', 'umd'],
			fileName: (format) => {
				if (format === 'cjs') return 'index.js'
				if (format === 'es') return 'index.es.js'
				return 'index.umd.js'
			},
		},
		sourcemap: true,
	},
	test: {
		environment: 'jsdom',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
			},
		},
	},
})
