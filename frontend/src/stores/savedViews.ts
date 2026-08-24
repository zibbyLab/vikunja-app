import {defineStore, acceptHMRUpdate} from 'pinia'
import {ref} from 'vue'

import {i18n} from '@/i18n'
import {success} from '@/message'
import type {TaskFilterParams} from '@/services/taskCollection'
import type {SortBy} from '@/composables/useTaskList'
import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'

export interface SavedView {
	id: string
	name: string
	params: TaskFilterParams
	sortBy: SortBy
}

function storageKey(projectId: IProject['id'], viewId: IProjectView['id']): string {
	return `savedViews:${projectId}:${viewId}`
}

function isValidSavedView(v: unknown): v is SavedView {
	if (!v || typeof v !== 'object') return false
	const c = v as Record<string, unknown>
	return (
		typeof c.id === 'string' && c.id !== '' &&
		typeof c.name === 'string' && c.name !== '' &&
		c.params !== null && typeof c.params === 'object' &&
		c.sortBy !== null && typeof c.sortBy === 'object'
	)
}

export const useSavedViewsStore = defineStore('savedViews', () => {
	const views = ref<SavedView[]>([])
	const loadError = ref(false)

	function load(projectId: IProject['id'], viewId: IProjectView['id']) {
		loadError.value = false
		try {
			const raw = localStorage.getItem(storageKey(projectId, viewId))
			if (!raw) {
				views.value = []
				return
			}
			const parsed: unknown = JSON.parse(raw)
			if (!Array.isArray(parsed)) {
				console.warn('[savedViews] Corrupted localStorage data: expected array, resetting.')
				views.value = []
				return
			}
			const valid: SavedView[] = []
			for (const item of parsed) {
				if (isValidSavedView(item)) {
					valid.push(item)
				} else {
					console.warn('[savedViews] Skipping invalid saved view entry:', item)
				}
			}
			views.value = valid
		} catch (e) {
			console.error('[savedViews] Failed to parse localStorage data:', e)
			loadError.value = true
			views.value = []
		}
	}

	function persist(projectId: IProject['id'], viewId: IProjectView['id']) {
		try {
			localStorage.setItem(storageKey(projectId, viewId), JSON.stringify(views.value))
		} catch (e) {
			console.error('[savedViews] Failed to write to localStorage:', e)
		}
	}

	function saveView(
		projectId: IProject['id'],
		viewId: IProjectView['id'],
		name: string,
		params: TaskFilterParams,
		sortBy: SortBy,
	) {
		const view: SavedView = {
			id: typeof crypto.randomUUID === 'function'
				? crypto.randomUUID()
				: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
			name: name.trim(),
			params: {...params},
			sortBy: {...sortBy},
		}
		views.value = [...views.value, view]
		persist(projectId, viewId)
		success({message: i18n.global.t('savedViews.saveSuccess')})
	}

	function renameView(
		projectId: IProject['id'],
		viewId: IProjectView['id'],
		id: SavedView['id'],
		name: string,
	) {
		views.value = views.value.map(v =>
			v.id === id ? {...v, name: name.trim()} : v,
		)
		persist(projectId, viewId)
		success({message: i18n.global.t('savedViews.renameSuccess')})
	}

	function deleteView(
		projectId: IProject['id'],
		viewId: IProjectView['id'],
		id: SavedView['id'],
	) {
		views.value = views.value.filter(v => v.id !== id)
		persist(projectId, viewId)
		success({message: i18n.global.t('savedViews.deleteSuccess')})
	}

	return {
		views,
		loadError,
		load,
		saveView,
		renameView,
		deleteView,
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useSavedViewsStore, import.meta.hot))
}
