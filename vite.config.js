import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [
		dts({
			include: ['src'],
			exclude: ['src/__tests__'],
			compilerOptions: { rootDir: 'src' },
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'UserPermissionsUtils',
			formats: ['cjs', 'es', 'umd'],
			fileName: (format) => {
				if (format === 'cjs') return 'index.js'
				if (format === 'es') return 'index.es.js'
				return 'index.umd.js'
			},
		},
		sourcemap: false,
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
