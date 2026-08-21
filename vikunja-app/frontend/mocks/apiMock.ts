import type {IncomingMessage, ServerResponse} from 'node:http'
import type {Plugin} from 'vite'

import {PERMISSIONS} from '../src/constants/permissions.ts'
import {MOCK_INFO, MOCK_TEAMS, MOCK_USER} from './seed.ts'

// Offline dev harness: serves just enough of the Vikunja /api/v1 surface for the
// SPA to boot, consider itself logged in and render real data without a Go
// backend. Everything lives in memory and resets when the dev server restarts.

const API_PREFIX = '/api/v1'

// 1x1 transparent PNG, used for every avatar request.
const BLANK_AVATAR = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64',
)

function base64Url(value: string): string {
	return Buffer.from(value).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '')
}

// The frontend only base64-decodes the payload, so an unsigned token is enough.
export function createMockToken(): string {
	const header = base64Url(JSON.stringify({alg: 'HS256', typ: 'JWT'}))
	const payload = base64Url(JSON.stringify({
		id: MOCK_USER.id,
		username: MOCK_USER.username,
		name: MOCK_USER.name,
		email: MOCK_USER.email,
		type: 1, // AUTH_TYPES.USER
		sid: 'mock-session',
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
	}))
	return `${header}.${payload}.mocksignature`
}

const teams = MOCK_TEAMS.map(team => ({...team}))

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
	res.statusCode = status
	res.setHeader('Content-Type', 'application/json')
	res.setHeader('x-pagination-total-pages', '1')
	res.setHeader('x-pagination-result-count', Array.isArray(body) ? String(body.length) : '1')
	for (const [name, value] of Object.entries(headers)) {
		res.setHeader(name, value)
	}
	res.end(JSON.stringify(body))
}

// The real API reports the requesting user's permission on a single object in
// this response header, and AbstractService.getM() reads it into
// model.maxPermission — a body field is ignored and would be overwritten. The
// mock user owns every seeded team, so it is always admin.
const ADMIN_PERMISSION_HEADER = {'x-max-permission': String(PERMISSIONS.ADMIN)}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
	return new Promise(resolve => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(chunk as Buffer))
		req.on('end', () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'))
			} catch {
				resolve({})
			}
		})
	})
}

export function vikunjaApiMock(): Plugin {
	return {
		name: 'vikunja-api-mock',
		apply: 'serve',

		// Boot straight into a logged-in session: the SPA reads this token from
		// localStorage before the router runs its auth guard.
		transformIndexHtml() {
			return [{
				tag: 'script',
				injectTo: 'head',
				children: `
					if (!localStorage.getItem('token')) {
						localStorage.setItem('token', ${JSON.stringify(createMockToken())})
					}
				`,
			}]
		},

		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const rawUrl = req.url || ''
				if (!rawUrl.startsWith(API_PREFIX)) {
					return next()
				}

				const url = new URL(rawUrl, 'http://mock.local')
				const path = url.pathname.slice(API_PREFIX.length) || '/'
				const method = (req.method || 'GET').toUpperCase()

				if (method === 'OPTIONS') {
					res.statusCode = 204
					return res.end()
				}

				if (path === '/info') {
					return send(res, 200, MOCK_INFO)
				}

				if (path === '/login' || path === '/user/token/refresh' || path === '/user/token') {
					return send(res, 200, {token: createMockToken()})
				}

				if (path === '/user' && method === 'GET') {
					return send(res, 200, MOCK_USER)
				}

				if (path.startsWith('/avatar/')) {
					res.statusCode = 200
					res.setHeader('Content-Type', 'image/png')
					return res.end(BLANK_AVATAR)
				}

				if (path === '/teams' && method === 'GET') {
					return send(res, 200, teams)
				}

				if (path === '/teams' && (method === 'PUT' || method === 'POST')) {
					const body = await readBody(req)
					const created = {
						...teams[0],
						id: teams.length + 1,
						name: String(body.name ?? 'New team'),
						description: String(body.description ?? ''),
						members: [],
					}
					teams.push(created)
					return send(res, 201, created)
				}

				const teamMatch = path.match(/^\/teams\/(\d+)$/)
				if (teamMatch) {
					const id = Number(teamMatch[1])
					const index = teams.findIndex(t => t.id === id)
					if (index === -1) {
						return send(res, 404, {message: 'Team does not exist.'})
					}
					if (method === 'DELETE') {
						teams.splice(index, 1)
						return send(res, 200, {message: 'Successfully deleted.'})
					}
					if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
						const body = await readBody(req)
						teams[index] = {...teams[index], ...body} as typeof teams[number]
						return send(res, 200, teams[index], ADMIN_PERMISSION_HEADER)
					}
					return send(res, 200, teams[index], ADMIN_PERMISSION_HEADER)
				}

				// Everything else the shell touches on boot (projects, labels,
				// notifications, subscriptions, …) is irrelevant to /teams — an
				// empty collection keeps the app quiet instead of erroring.
				if (method === 'GET') {
					return send(res, 200, [])
				}
				return send(res, 200, {})
			})
		},
	}
}
