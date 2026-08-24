/**
 * vite.mock.config.ts – dev-only Vite config that extends the main config
 * and intercepts /api/v1/* with a mock API so the app runs without a backend.
 *
 * Usage:
 *   pnpm vite --config vite.mock.config.ts --host
 */

import {defineConfig, mergeConfig, loadEnv} from 'vite'
import type {Plugin, UserConfig, ConfigEnv} from 'vite'
import type {IncomingMessage, ServerResponse} from 'node:http'

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const MOCK_USER = {
	id: 1,
	username: 'demo',
	name: 'Demo User',
	email: 'demo@vikunja.io',
	is_local_user: true,
	is_admin: false,
	created: '2024-01-01T00:00:00Z',
	updated: '2024-01-01T00:00:00Z',
	settings: {
		language: 'en',
		week_start: 0,
		overdue_tasks_reminders_time: '9:00',
		default_project_id: 0,
		frontend_settings: {},
	},
}

// Labels with intentionally mixed case so A→Z sort is observable
const MOCK_LABELS = [
	{id: 1, title: 'apple',      hex_color: 'ff6384', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 2, title: 'Banana',     hex_color: 'ffce56', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 3, title: 'cherry',     hex_color: 'c0392b', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 4, title: 'Date',       hex_color: '36a2eb', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 5, title: 'elderberry', hex_color: '4bc0c0', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 6, title: 'Fig',        hex_color: '9966ff', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
	{id: 7, title: 'grape',      hex_color: '7c4dff', description: '', project_id: 0, created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z'},
]

// Tasks seeded for project 1 / view 10 (the working "List" view)
const MOCK_TASKS_P1 = [
	{id: 1,  title: 'Design homepage mockup',       done: false, project_id: 1, position: 100, priority: 0, labels: [{...{id:1,title:'apple',hex_color:'ff6384',description:'',project_id:0},created_by:{id:1,username:'demo'},created:'2024-01-01T00:00:00Z',updated:'2024-01-01T00:00:00Z'}], assignees: [], attachments: [], related_tasks: {}, reminders: [], subscription: null, created_by: {id:1,username:'demo'}, due_date: '0001-01-01T00:00:00Z', start_date: '0001-01-01T00:00:00Z', end_date: '0001-01-01T00:00:00Z', percent_done: 0, repeat_after: 0, repeat_mode: 0, description: '', hex_color: '', identifier: 'WR-1', index: 1, is_favorite: false, bucket_id: 0, cover_image_attachment_id: 0, created: '2024-01-15T10:00:00Z', updated: '2024-01-15T10:00:00Z'},
	{id: 2,  title: 'Set up CI/CD pipeline',        done: false, project_id: 1, position: 200, priority: 2, labels: [], assignees: [], attachments: [], related_tasks: {}, reminders: [], subscription: null, created_by: {id:1,username:'demo'}, due_date: '0001-01-01T00:00:00Z', start_date: '0001-01-01T00:00:00Z', end_date: '0001-01-01T00:00:00Z', percent_done: 0, repeat_after: 0, repeat_mode: 0, description: '', hex_color: '', identifier: 'WR-2', index: 2, is_favorite: false, bucket_id: 0, cover_image_attachment_id: 0, created: '2024-01-16T09:00:00Z', updated: '2024-01-16T09:00:00Z'},
	{id: 3,  title: 'Write API documentation',      done: true,  project_id: 1, position: 300, priority: 0, labels: [], assignees: [], attachments: [], related_tasks: {}, reminders: [], subscription: null, created_by: {id:1,username:'demo'}, due_date: '0001-01-01T00:00:00Z', start_date: '0001-01-01T00:00:00Z', end_date: '0001-01-01T00:00:00Z', percent_done: 100, repeat_after: 0, repeat_mode: 0, description: '', hex_color: '', identifier: 'WR-3', index: 3, is_favorite: false, bucket_id: 0, cover_image_attachment_id: 0, created: '2024-01-17T11:00:00Z', updated: '2024-01-18T14:00:00Z'},
	{id: 4,  title: 'Review accessibility audit',   done: false, project_id: 1, position: 400, priority: 1, labels: [], assignees: [], attachments: [], related_tasks: {}, reminders: [], subscription: null, created_by: {id:1,username:'demo'}, due_date: '0001-01-01T00:00:00Z', start_date: '0001-01-01T00:00:00Z', end_date: '0001-01-01T00:00:00Z', percent_done: 0, repeat_after: 0, repeat_mode: 0, description: '', hex_color: '', identifier: 'WR-4', index: 4, is_favorite: false, bucket_id: 0, cover_image_attachment_id: 0, created: '2024-01-18T08:00:00Z', updated: '2024-01-18T08:00:00Z'},
	{id: 5,  title: 'Deploy to staging environment', done: false, project_id: 1, position: 500, priority: 3, labels: [], assignees: [], attachments: [], related_tasks: {}, reminders: [], subscription: null, created_by: {id:1,username:'demo'}, due_date: '2026-09-01T00:00:00Z', start_date: '0001-01-01T00:00:00Z', end_date: '0001-01-01T00:00:00Z', percent_done: 0, repeat_after: 0, repeat_mode: 0, description: '', hex_color: '', identifier: 'WR-5', index: 5, is_favorite: false, bucket_id: 0, cover_image_attachment_id: 0, created: '2024-01-19T13:00:00Z', updated: '2024-01-19T13:00:00Z'},
]

// Teams with mixed case so case-insensitive search is observable
const MOCK_TEAMS = [
	{id: 1, name: 'Core-Platform',  description: '', created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z', is_public: false, max_permission: 2},
	{id: 2, name: 'Design',         description: '', created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z', is_public: false, max_permission: 2},
	{id: 3, name: 'QA-Automation',  description: '', created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z', is_public: false, max_permission: 2},
	{id: 4, name: 'growth',         description: '', created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z', is_public: false, max_permission: 2},
	{id: 5, name: 'Support Core',   description: '', created_by: {id: 1, username: 'demo'}, created: '2024-01-01T00:00:00Z', updated: '2024-01-01T00:00:00Z', is_public: false, max_permission: 2},
]

// Projects in position order, with favorites deliberately interleaved so a
// "favorites first" reordering is observable.
const MOCK_PROJECTS = [
	{id: 1, title: 'Website Relaunch',   is_favorite: false, position: 100},
	{id: 2, title: 'Mobile App',         is_favorite: true,  position: 200},
	{id: 3, title: 'Customer Support',   is_favorite: false, position: 300},
	{id: 4, title: 'Hiring Pipeline',    is_favorite: true,  position: 400},
	{id: 5, title: 'Marketing Campaign', is_favorite: false, position: 500},
	{id: 6, title: 'Infrastructure',     is_favorite: false, position: 600},
	{id: 7, title: 'Old Roadmap 2023',   is_favorite: false, position: 700, is_archived: true},
	{id: 8, title: 'Design System',      is_favorite: true,  position: 800},
].map(p => ({
	description: '',
	hex_color: '',
	identifier: '',
	is_archived: false,
	background_information: null,
	background_blur_hash: '',
	parent_project_id: 0,
	owner: {id: 1, username: 'demo', name: 'Demo User'},
	subscription: null,
	views: [
			{id: p.id * 10, project_id: p.id, title: 'List', view_kind: 'list', filter: '', position: 100, bucket_configuration_mode: 'none', bucket_configuration: []},
			// Project 1 gets a second view whose filter references deleted label 999 —
			// switching to it demonstrates the stale-filter error handling.
			...(p.id === 1 ? [{id: 11, project_id: 1, title: 'By Label (stale)', view_kind: 'list', filter: 'label = 999', position: 200, bucket_configuration_mode: 'none', bucket_configuration: []}] : []),
		],
	created: '2024-01-01T00:00:00Z',
	updated: '2024-01-01T00:00:00Z',
	...p,
}))

const MOCK_CONFIG = {
	version: 'mock',
	frontend_url: 'http://localhost:4173',
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
		local: {enabled: true, registration_enabled: true},
		ldap: {enabled: false},
		openid_connect: {enabled: false, redirect_url: '', providers: []},
	},
	public_teams_enabled: false,
	allow_icon_changes: true,
	enabled_pro_features: [],
	concurrent_writes: false,
}

// ---------------------------------------------------------------------------
// JWT helpers (Node-side, for injecting auth into the page)
// ---------------------------------------------------------------------------

function makeMockJwt(): string {
	const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url')
	const payload = Buffer.from(JSON.stringify({
		id: 1,
		username: 'demo',
		name: 'Demo User',
		email: 'demo@vikunja.io',
		type: 1, // AUTH_TYPES.USER
		exp: Math.floor(Date.now() / 1000) + 86400 * 365 * 10, // valid for 10 years
		sid: 'mock-session',
	})).toString('base64url')
	return `${header}.${payload}.mock_sig`
}

// ---------------------------------------------------------------------------
// Mock API middleware plugin
// ---------------------------------------------------------------------------

function mockApiPlugin(token: string): Plugin {
	// Minimal 1×1 transparent PNG for avatar responses
	const TINY_PNG = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
		'base64',
	)

	return {
		name: 'vikunja-mock-api',

		// Inject the auth token before main.ts executes so the app boots as an
		// authenticated user without needing a real backend.
		transformIndexHtml: {
			order: 'pre' as const,
			handler() {
				return [{
					tag: 'script',
					injectTo: 'head-prepend' as const,
					children: `localStorage.setItem('token', '${token}');\nlocalStorage.setItem('API_URL', '/api/v1');`,
				}]
			},
		},

		configureServer(server) {
			server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
				const rawUrl = req.url || ''
				if (!rawUrl.startsWith('/api/v1')) {
					return next()
				}

				const path = rawUrl.split('?')[0]

				function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
					const body = JSON.stringify(data)
					res.writeHead(status, {
						'Content-Type': 'application/json',
						'Content-Length': String(Buffer.byteLength(body)),
						'Access-Control-Allow-Origin': '*',
						...extra,
					})
					res.end(body)
				}

				function paginatedJson(data: unknown[]) {
					return json(data, 200, {
						'x-pagination-result-count': String(data.length),
						'x-pagination-total-pages': '1',
					})
				}

				// OPTIONS pre-flight
				if (req.method === 'OPTIONS') {
					res.writeHead(204, {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'})
					return res.end()
				}

				if (req.method === 'GET') {
					if (path === '/api/v1/info') return json(MOCK_CONFIG)
					if (path === '/api/v1/user') return json(MOCK_USER)
					if (path === '/api/v1/labels') return paginatedJson(MOCK_LABELS)
					if (path === '/api/v1/projects') return paginatedJson(MOCK_PROJECTS)
					const projectMatch = /^\/api\/v1\/projects\/(\d+)$/.exec(path)
					if (projectMatch) {
						const project = MOCK_PROJECTS.find(p => p.id === Number(projectMatch[1]))
						return project
							? json(project)
							: json({message: 'project does not exist', code: 3001}, 404)
					}
					// View 11 ("By Label (stale)") has a filter referencing a deleted label —
					// simulate the 400 the real API would return so edge-case handling is testable.
					if (/^\/api\/v1\/projects\/1\/views\/11\/tasks$/.test(path)) {
						return json({message: 'label not found', code: 8001}, 400)
					}
					// View 10 (project 1, "List") — return real seed tasks so there is a
					// visible "previous state" to restore after the stale-filter error.
					if (/^\/api\/v1\/projects\/1\/views\/10\/tasks$/.test(path)) return paginatedJson(MOCK_TASKS_P1)
					if (/^\/api\/v1\/projects\/\d+\/views\/\d+\/tasks$/.test(path)) return paginatedJson([])
					const projectViewsMatch = /^\/api\/v1\/projects\/(\d+)\/views$/.exec(path)
					if (projectViewsMatch) {
						const project = MOCK_PROJECTS.find(p => p.id === Number(projectViewsMatch[1]))
						return project ? paginatedJson(project.views) : json({message: 'project does not exist', code: 3001}, 404)
					}
					if (path === '/api/v1/namespaces') return paginatedJson([])
					if (path === '/api/v1/notifications') return paginatedJson([])
					if (path === '/api/v1/teams') return paginatedJson(MOCK_TEAMS)
					const teamMatch = /^\/api\/v1\/teams\/(\d+)$/.exec(path)
					if (teamMatch) {
						const team = MOCK_TEAMS.find(t => t.id === Number(teamMatch[1]))
						return team
							? json({...team, members: [{...MOCK_USER, admin: true}]})
							: json({message: 'team does not exist', code: 6001}, 404)
					}
					if (/^\/api\/v1\/avatar\//.test(path)) {
						res.writeHead(200, {'Content-Type': 'image/png', 'Content-Length': String(TINY_PNG.length)})
						return res.end(TINY_PNG)
					}
				}

				// Swallow refresh-token requests silently — the JWT we injected is
				// long-lived so this path is only hit if the app decides to refresh proactively.
				if (req.method === 'POST' && path === '/api/v1/user/token/refresh') {
					return json({token: token})
				}

				// Catch-all: structured 404 so the frontend error handler gets valid JSON
				return json({message: 'mock: not implemented', code: 0}, 404)
			})
		},
	}
}

// ---------------------------------------------------------------------------
// Config export
// ---------------------------------------------------------------------------

export default defineConfig(async (env: ConfigEnv) => {
	// Dynamically import the base config factory (avoids circular-import issues
	// with the default export of vite.config.ts being a function).
	const {default: baseConfigFn} = await import('./vite.config.ts')

	const loadedEnv = loadEnv(env.mode, process.cwd(), '')
	const baseConfig: UserConfig =
		(typeof baseConfigFn === 'function' ? baseConfigFn(env) : baseConfigFn) ?? {}

	const token = makeMockJwt()

	return mergeConfig(baseConfig, {
		plugins: [mockApiPlugin(token)],
		server: {
			// Must bind to 0.0.0.0 so the preview proxy can reach us from
			// outside the container.  The base config uses 127.0.0.1.
			host: '0.0.0.0',
			port: parseInt(loadedEnv.VIKUNJA_FRONTEND_PORT || '4173', 10),
		},
	} as UserConfig)
})
