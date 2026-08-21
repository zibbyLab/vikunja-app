import {defineConfig, type UserConfig, type UserConfigFnObject} from 'vite'

import baseConfig from './vite.config.ts'
import {vikunjaApiMock} from './mocks/apiMock.ts'

// Dev-only entry point: the stock vite config plus an in-process mock of the
// Vikunja REST API, so the frontend runs with no Go backend.
//   pnpm vite --config vite.mock.config.ts
export default defineConfig(async env => {
	const resolved = await (baseConfig as UserConfigFnObject)(env) as UserConfig

	return {
		...resolved,
		plugins: [...(resolved.plugins ?? []), vikunjaApiMock()],
		server: {
			...resolved.server,
			host: true,
			strictPort: false,
		},
	}
})
