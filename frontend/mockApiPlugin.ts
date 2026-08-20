/**
 * Vite dev-server plugin that mocks the Vikunja REST API (/api/v1/*).
 * Runs ONLY in the dev-server (configureServer); has zero effect on builds.
 *
 * Provides:
 *  - GET  /api/v1/info           – config response (no real backend needed)
 *  - POST /api/v1/login          – returns the mock JWT
 *  - GET  /api/v1/user           – returns the demo user
 *  - GET  /api/v1/labels         – returns the seeded label list
 *  - DELETE /api/v1/labels/:id   – removes a label from the in-memory list
 *  - GET  /api/v1/avatar/*       – returns a 1×1 transparent PNG
 *  - POST /api/v1/user/token/refresh – refreshes the mock token
 *  - anything else under /api/v1 – 200 {}
 *
 * Also injects a <script> into index.html that pre-sets the mock JWT in
 * localStorage so the app boots directly into a logged-in state.
 */

import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ── Mock JWT ─────────────────────────────────────────────────────────────────
// Payload: { id:1, exp:9999999999, type:1, username:"demo",
//            email:"demo@vikunja.local", name:"Demo User", sid:"mock-session" }
// exp=9999999999 is year 2286 – will never expire in practice.
const MOCK_TOKEN =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
	'.eyJpZCI6MSwiZXhwIjo5OTk5OTk5OTk5LCJ0eXBlIjoxLCJ1c2VybmFtZSI6ImRlbW8iLCJlbWFpbCI6ImRlbW9AdmlrdW5qYS5sb2NhbCIsIm5hbWUiOiJEZW1vIFVzZXIiLCJzaWQiOiJtb2NrLXNlc3Npb24ifQ' +
	'.mocksig'

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEMO_USER = {
	id: 1,
	username: 'demo',
	email: 'demo@vikunja.local',
	name: 'Demo User',
}

const SEED_LABELS = [
	{ id: 1, title: 'Urgent',        hex_color: 'e11d48', description: '', created_by: DEMO_USER, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z' },
	{ id: 2, title: 'Backend',       hex_color: '2563eb', description: '', created_by: DEMO_USER, created: '2024-01-02T00:00:00Z', updated: '2024-01-02T00:00:00Z' },
	{ id: 3, title: 'WIP-Review',    hex_color: 'd97706', description: '', created_by: DEMO_USER, created: '2024-01-03T00:00:00Z', updated: '2024-01-03T00:00:00Z' },
	{ id: 4, title: 'documentation', hex_color: '16a34a', description: '', created_by: DEMO_USER, created: '2024-01-04T00:00:00Z', updated: '2024-01-04T00:00:00Z' },
	{ id: 5, title: 'Design',        hex_color: '7c3aed', description: '', created_by: DEMO_USER, created: '2024-01-05T00:00:00Z', updated: '2024-01-05T00:00:00Z' },
]

// 1×1 transparent PNG (base64)
const PNG_1X1 = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
	'base64',
)

// ── In-memory state (reset each time the plugin is instantiated = server start) ──
let labels = SEED_LABELS.map(l => ({ ...l }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendJson(
	res: ServerResponse,
	data: unknown,
	status = 200,
	extra: Record<string, string> = {},
) {
	const body = JSON.stringify(data)
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(body).toString(),
		...extra,
	})
	res.end(body)
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export function mockApiPlugin(): Plugin {
	// Reset label list whenever the dev server restarts
	labels = SEED_LABELS.map(l => ({ ...l }))

	return {
		name: 'vikunja-mock-api',

		// Inject a synchronous <script> at the top of <head> so that:
		//  (a) localStorage already has the token when main.ts runs, and
		//  (b) the preview-platform path prefix is stripped from window.location
		//      BEFORE vue-router initialises (otherwise it sees the full
		//      /preview/<id>/<port>/labels path and shows a 404).
		transformIndexHtml() {
			return [
				{
					tag: 'script',
					// language=JavaScript
					children: `
;(function () {
  // Pre-set mock auth token
  localStorage.setItem('token', '${MOCK_TOKEN}')

  // Strip the platform preview prefix so vue-router sees the real path.
  // Pattern: /preview/<uuid>/<port>/<actual-path>
  var m = window.location.pathname.match(/^\\/preview\\/[^/]+\\/\\d+(\\/.*)?$/)
  if (m) {
    var real = m[1] || '/'
    history.replaceState(null, '', real + window.location.search + window.location.hash)
  }
})()`,
					injectTo: 'head-prepend',
				},
			]
		},

		configureServer(server) {
			server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
				// Strip query-string for routing
				const url = (req.url ?? '').split('?')[0]

				if (!url.startsWith('/api/v1')) {
					return next()
				}

				const method = req.method ?? 'GET'

				// ── GET /api/v1/info ──────────────────────────────────────────
				if (method === 'GET' && url === '/api/v1/info') {
					return sendJson(res, {
						version: '0.0.0-mock',
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
						public_teams_enabled: false,
						allow_icon_changes: false,
						enabled_pro_features: [],
						concurrent_writes: false,
					})
				}

				// ── POST /api/v1/login ────────────────────────────────────────
				if (method === 'POST' && url === '/api/v1/login') {
					return sendJson(res, { token: MOCK_TOKEN })
				}

				// ── GET /api/v1/user ──────────────────────────────────────────
				if (method === 'GET' && url === '/api/v1/user') {
					return sendJson(res, {
						id: 1,
						username: 'demo',
						email: 'demo@vikunja.local',
						name: 'Demo User',
						type: 1,
						is_local_user: true,
						deletion_scheduled_at: null,
						created: '2024-01-01T00:00:00Z',
						updated: '2024-01-01T00:00:00Z',
						settings: {
							name: 'Demo User',
							email_reminders_enabled: false,
							discoverable_by_name: false,
							discoverable_by_email: false,
							overdue_tasks_reminders_enabled: false,
							overdue_tasks_reminders_time: null,
							default_project_id: null,
							week_start: 0,
							timezone: 'UTC',
							language: 'en',
							frontend_settings: {},
						},
					})
				}

				// ── GET /api/v1/labels ────────────────────────────────────────
				if (method === 'GET' && url === '/api/v1/labels') {
					return sendJson(res, labels, 200, {
						'x-pagination-total-pages': '1',
						'x-pagination-result-count': String(labels.length),
					})
				}

				// ── DELETE /api/v1/labels/:id ─────────────────────────────────
				const deleteMatch = url.match(/^\/api\/v1\/labels\/(\d+)$/)
				if (method === 'DELETE' && deleteMatch) {
					const id = parseInt(deleteMatch[1], 10)
					labels = labels.filter(l => l.id !== id)
					return sendJson(res, { message: 'success' })
				}

				// ── POST /api/v1/user/token/refresh ───────────────────────────
				if (method === 'POST' && url === '/api/v1/user/token/refresh') {
					return sendJson(res, { token: MOCK_TOKEN })
				}

				// ── GET /api/v1/avatar/* ──────────────────────────────────────
				if (method === 'GET' && url.startsWith('/api/v1/avatar/')) {
					res.writeHead(200, {
						'Content-Type': 'image/png',
						'Content-Length': PNG_1X1.length.toString(),
					})
					return res.end(PNG_1X1)
				}

				// ── Catch-all: unknown /api/v1 routes → 200 {} ───────────────
				return sendJson(res, {})
			})
		},
	}
}
