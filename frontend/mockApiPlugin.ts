/**
 * Vite dev-server plugin that intercepts /api/v1/* requests and returns
 * realistic mock data so the frontend runs without a real Vikunja backend.
 *
 * Five labels are seeded: Urgent, Backend, WIP-Review, documentation, urgent-review.
 * A mock JWT (non-expiring) is injected into localStorage via transformIndexHtml
 * so the app boots straight into a logged-in state.
 */
import type { Plugin } from 'vite'
import type { ServerResponse } from 'http'

// Header: {"alg":"HS256","typ":"JWT"}
// Payload: {"id":1,"username":"demouser","exp":9999999999,"type":1}
// Signature: placeholder (not verified by the frontend)
const MOCK_TOKEN =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
	'eyJpZCI6MSwidXNlcm5hbWUiOiJkZW1vdXNlciIsImV4cCI6OTk5OTk5OTk5OSwidHlwZSI6MX0.' +
	'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const DATE = '2024-01-01T00:00:00Z'
const CREATED_BY = { id: 1, username: 'demouser', email: 'demo@example.com' }

const MOCK_LABELS = [
	{ id: 1, title: 'Urgent',        hex_color: 'ef4444', description: '', created_by: CREATED_BY, created: DATE, updated: DATE },
	{ id: 2, title: 'Backend',       hex_color: '3b82f6', description: '', created_by: CREATED_BY, created: DATE, updated: DATE },
	{ id: 3, title: 'WIP-Review',    hex_color: 'f59e0b', description: '', created_by: CREATED_BY, created: DATE, updated: DATE },
	{ id: 4, title: 'documentation', hex_color: '10b981', description: '', created_by: CREATED_BY, created: DATE, updated: DATE },
	{ id: 5, title: 'urgent-review', hex_color: 'ec4899', description: '', created_by: CREATED_BY, created: DATE, updated: DATE },
]

const MOCK_USER = {
	id: 1,
	username: 'demouser',
	email: 'demo@example.com',
	name: 'Demo User',
	is_local_user: true,
	created: DATE,
	updated: DATE,
	settings: {
		language: 'en',
		timezone: 'UTC',
		week_start_day: 0,
		overdue_tasks_reminders_enabled: false,
		frontend_settings: {
			play_sound_when_done: false,
			color_schema: 'auto',
		},
	},
}

const MOCK_INFO = {
	version: '0.22.0-mock',
	frontend_url: '',
	motd: '',
	link_sharing_enabled: true,
	max_file_size: '20MB',
	max_items_per_page: 50,
	task_attachments_enabled: false,
	totp_enabled: false,
	enabled_background_providers: [],
	legal: { imprint_url: '', privacy_policy_url: '' },
	caldav_enabled: false,
	user_deletion_enabled: false,
	task_comments_enabled: false,
	demo_mode_enabled: false,
	webhooks_enabled: false,
	auth: {
		local: { enabled: true, registration_enabled: true },
		ldap: { enabled: false },
		openid_connect: { enabled: false, redirect_url: '', providers: [] },
	},
}

// Minimal 1×1 transparent PNG used as a placeholder avatar
const AVATAR_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64',
)

function sendJson(res: ServerResponse, data: unknown, extraHeaders: Record<string, string> = {}): void {
	const body = JSON.stringify(data)
	res.writeHead(200, {
		'Content-Type': 'application/json',
		'Content-Length': String(Buffer.byteLength(body)),
		'x-pagination-total-pages': '1',
		'x-pagination-result-count': '0',
		...extraHeaders,
	})
	res.end(body)
}

export function mockApiPlugin(): Plugin {
	return {
		name: 'vikunja-mock-api',

		// Inject a pre-seeded JWT into localStorage so the app starts logged in
		transformIndexHtml(html: string): string {
			const script =
				`<script>` +
				`if(!localStorage.getItem('token')){` +
				`localStorage.setItem('token','${MOCK_TOKEN}')` +
				`}` +
				`<\/script>`
			return html.replace('</body>', script + '</body>')
		},

		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.url ?? ''

				if (!url.startsWith('/api/v1')) {
					return next()
				}

				// Let WebSocket upgrade requests (Vikunja live-updates) fall through
				if (req.headers.upgrade === 'websocket') {
					return next()
				}

				// CORS preflight
				if (req.method === 'OPTIONS') {
					res.writeHead(204, {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Authorization, Content-Type',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
					})
					return res.end()
				}

				const path = url.replace(/^\/api\/v1/, '').split('?')[0]
				const method = req.method ?? 'GET'

				// ── API Info ────────────────────────────────────────────────────────
				if (path === '/info' && method === 'GET') {
					return sendJson(res, MOCK_INFO)
				}

				// ── Auth ────────────────────────────────────────────────────────────
				if (path === '/login' && method === 'POST') {
					return sendJson(res, { token: MOCK_TOKEN })
				}

				if (path === '/user/token/refresh' && method === 'POST') {
					return sendJson(res, { token: MOCK_TOKEN })
				}

				// ── Current user ────────────────────────────────────────────────────
				if (path === '/user' && method === 'GET') {
					return sendJson(res, MOCK_USER)
				}

				// ── Labels ──────────────────────────────────────────────────────────
				if (path === '/labels' && method === 'GET') {
					return sendJson(res, MOCK_LABELS, {
						'x-pagination-result-count': String(MOCK_LABELS.length),
					})
				}

				// ── Projects (empty list so the sidebar doesn't error) ───────────────
				if (path === '/projects' && method === 'GET') {
					return sendJson(res, [], { 'x-pagination-result-count': '0' })
				}

				// ── Notifications ────────────────────────────────────────────────────
				if (path === '/notifications' && method === 'GET') {
					return sendJson(res, [])
				}

				// ── Avatar ───────────────────────────────────────────────────────────
				if (path.startsWith('/avatar/') && method === 'GET') {
					res.writeHead(200, {
						'Content-Type': 'image/png',
						'Content-Length': String(AVATAR_PNG.length),
					})
					return res.end(AVATAR_PNG)
				}

				if (path === '/user/settings/avatar' && method === 'GET') {
					return sendJson(res, { avatar_provider: 'initials' })
				}

				// ── Fallback: return an empty object for any other /api/v1 call ──────
				return sendJson(res, {})
			})
		},
	}
}
