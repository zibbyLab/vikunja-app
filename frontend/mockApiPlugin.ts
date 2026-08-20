/**
 * Vite dev-only plugin: mocks the Vikunja REST API so the frontend can run
 * without a real backend.  Every /api/v1/* request is intercepted and answered
 * with in-memory data.  The plugin also injects a pre-signed JWT into
 * localStorage so the app opens in a logged-in state immediately.
 *
 * Only active in serve (dev) mode because of `apply: 'serve'`.
 */
import type { Plugin } from 'vite'
import type { ServerResponse } from 'node:http'

// JWT with type=1 (USER), id=1, username="demo", exp=9999999999 (year 2286)
// The app only checks expiry, not the signature — so this static token works.
const MOCK_JWT =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
	'.eyJ0eXBlIjoxLCJzdWIiOiIxIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjEwMDAwMDAwMDAsImlkIjoxLCJ1c2VybmFtZSI6ImRlbW8ifQ' +
	'.mock_signature_do_not_verify'

// Seed labels that satisfy the acceptance criteria:
//   • at least 4 labels
//   • one with "urgent" in the title (mixed-case: "Urgent")
//   • one with clearly mixed-case title ("WIP-Review")
const MOCK_LABELS = [
	{
		id: 1,
		title: 'Urgent',
		hex_color: 'e74c3c',
		description: '',
		created_by: {id: 1, username: 'demo', email: 'demo@vikunja.io', name: 'Demo User'},
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
	},
	{
		id: 2,
		title: 'Backend',
		hex_color: '3498db',
		description: '',
		created_by: {id: 1, username: 'demo', email: 'demo@vikunja.io', name: 'Demo User'},
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
	},
	{
		id: 3,
		title: 'WIP-Review',
		hex_color: 'f39c12',
		description: '',
		created_by: {id: 1, username: 'demo', email: 'demo@vikunja.io', name: 'Demo User'},
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
	},
	{
		id: 4,
		title: 'documentation',
		hex_color: '27ae60',
		description: '',
		created_by: {id: 1, username: 'demo', email: 'demo@vikunja.io', name: 'Demo User'},
		created: '2024-01-01T00:00:00Z',
		updated: '2024-01-01T00:00:00Z',
	},
]

const MOCK_USER = {
	id: 1,
	username: 'demo',
	email: 'demo@vikunja.io',
	name: 'Demo User',
	is_local_user: true,
	settings: {
		name: 'Demo User',
		email_reminders_enabled: false,
		discoverable_by_name: false,
		discoverable_by_email: false,
		overdue_tasks_reminders_enabled: false,
		default_project_id: null,
		week_start: 0,
		timezone: 'UTC',
		language: 'en',
		frontend_settings: {},
	},
	created: '2024-01-01T00:00:00Z',
	updated: '2024-01-01T00:00:00Z',
}

// configStore.update() calls objectToCamelCase on this, so snake_case is correct.
const MOCK_INFO = {
	version: 'v0.24.0-mock',
	frontend_url: '',
	motd: '',
	link_sharing_enabled: true,
	max_file_size: '20MB',
	max_items_per_page: 50,
	available_migrators: [],
	task_attachments_enabled: true,
	totp_enabled: false,
	enabled_background_providers: [],
	legal: {imprint_url: '', privacy_policy_url: ''},
	caldav_enabled: false,
	user_deletion_enabled: false,
	task_comments_enabled: true,
	demo_mode_enabled: false,
	webhooks_enabled: false,
	auth: {
		local: {enabled: true, registration_enabled: false},
		ldap: {enabled: false},
		openid_connect: {enabled: false, redirect_url: '', providers: []},
	},
	public_teams_enabled: false,
	allow_icon_changes: true,
	enabled_pro_features: [],
	concurrent_writes: false,
}

function jsonResponse(res: ServerResponse, data: unknown, extra: Record<string, string> = {}) {
	res.writeHead(200, {'content-type': 'application/json', ...extra})
	res.end(JSON.stringify(data))
}

function paginatedResponse(res: ServerResponse, data: unknown[]) {
	jsonResponse(res, data, {
		'x-pagination-total-pages': '1',
		'x-pagination-result-count': String(data.length),
	})
}

function avatarSvg(initial: string): string {
	return (
		'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">' +
		'<rect width="40" height="40" rx="20" fill="#1973ff"/>' +
		`<text x="20" y="27" text-anchor="middle" font-size="18" fill="#fff" font-family="sans-serif">${initial}</text>` +
		'</svg>'
	)
}

export function mockApiPlugin(): Plugin {
	return {
		name: 'vikunja-mock-api',
		apply: 'serve',

		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.url ?? ''

				if (!url.startsWith('/api/v1')) {
					return next()
				}

				const method = req.method?.toUpperCase() ?? 'GET'

				// Strip query string to get a clean path for routing
				const path = url.replace(/^\/api\/v1/, '').split('?')[0]

				if (method === 'OPTIONS') {
					res.writeHead(204)
					res.end()
					return
				}

				if (path === '/info' && method === 'GET') {
					return jsonResponse(res, MOCK_INFO)
				}

				if (path === '/user' && method === 'GET') {
					return jsonResponse(res, MOCK_USER)
				}

				if (path === '/user/logout' && method === 'POST') {
					return jsonResponse(res, {})
				}

				if (path === '/user/token/refresh' && method === 'POST') {
					return jsonResponse(res, {token: MOCK_JWT})
				}

				if (path === '/user/settings/avatar' && method === 'GET') {
					return jsonResponse(res, {avatar_provider: 'initials'})
				}

				if (path.startsWith('/avatar/')) {
					res.writeHead(200, {'content-type': 'image/svg+xml'})
					res.end(avatarSvg('D'))
					return
				}

				if (path === '/labels') {
					if (method === 'GET') {
						return paginatedResponse(res, MOCK_LABELS)
					}
					return jsonResponse(res, {})
				}

				if (path.match(/^\/labels\/\d+$/)) {
					if (method === 'GET') {
						const id = Number(path.split('/').pop())
						const label = MOCK_LABELS.find(l => l.id === id)
						return jsonResponse(res, label ?? {})
					}
					return jsonResponse(res, {})
				}

				if (path === '/projects') {
					return paginatedResponse(res, [])
				}

				if (path === '/login' && method === 'POST') {
					return jsonResponse(res, {token: MOCK_JWT})
				}

				// Catch-all for any other /api/v1/* route the app might call
				return jsonResponse(res, {})
			})
		},

		transformIndexHtml(html) {
			// 1. Strip the preview-proxy path prefix so that Vue Router sees "/" not
			//    "/preview/<id>/<port>/", which would match the catch-all 404 route.
			//    After history.replaceState the cookie-based session still routes all
			//    root-absolute XHR / asset requests back to this dev server.
			// 2. Pre-seed the mock JWT so the app opens in a logged-in state.
			const snippet =
				`<script>` +
				`(function(){` +
				`var m=window.location.pathname.match(/^(\\/preview\\/[^\\/]+\\/\\d+)(\\/.*)?$/);` +
				`if(m)history.replaceState(null,'',m[2]||'/');` +
				`if(!localStorage.getItem('token'))localStorage.setItem('token','${MOCK_JWT}');` +
				`})();` +
				`</script>`
			return html.replace('</head>', snippet + '\n</head>')
		},
	}
}
