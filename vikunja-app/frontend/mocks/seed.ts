// Fixture data for the offline mock API. Everything the dev harness serves is
// derived from here so a single edit changes what the running app shows.

export const MOCK_USER = {
	id: 1,
	username: 'demo',
	name: 'Demo User',
	email: 'demo@vikunja.io',
	created: '2024-01-01T10:00:00Z',
	updated: '2024-01-01T10:00:00Z',
	is_local_user: true,
	is_active: true,
	settings: {
		name: 'Demo User',
		email_reminders_enabled: false,
		discoverable_by_name: true,
		discoverable_by_email: false,
		overdue_tasks_reminders_enabled: false,
		week_start: 1,
		language: 'en',
		timezone: 'UTC',
		frontend_settings: {},
	},
}

function team(id: number, name: string, description: string) {
	return {
		id,
		name,
		description,
		is_public: false,
		external_id: '',
		// TeamModel declares `permission`; the admin gate in EditTeam.vue reads
		// maxPermission, which the API supplies via the x-max-permission header.
		permission: 2,
		created_by: MOCK_USER,
		created: '2024-02-0' + id + 'T09:00:00Z',
		updated: '2024-03-0' + id + 'T09:00:00Z',
		members: [{...MOCK_USER, admin: true, team_id: id}],
	}
}

export const MOCK_TEAMS = [
	team(1, 'Core-Platform', 'Owns the API and the shared services.'),
	team(2, 'Design', 'Visual design, design system and user research.'),
	team(3, 'QA-Automation', 'End-to-end coverage and release verification.'),
	team(4, 'growth', 'Onboarding funnel, lifecycle mail and experiments.'),
	team(5, 'Support', 'Customer conversations and bug triage.'),
]

export const MOCK_INFO = {
	version: 'mock-dev',
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
	user_deletion_enabled: true,
	task_comments_enabled: true,
	demo_mode_enabled: false,
	webhooks_enabled: false,
	auth: {
		local: {enabled: true, registration_enabled: true},
		ldap: {enabled: false},
		openid_connect: {enabled: false, redirect_url: '', providers: []},
	},
	public_teams_enabled: true,
	allow_icon_changes: true,
	enabled_pro_features: [],
	concurrent_writes: false,
}
