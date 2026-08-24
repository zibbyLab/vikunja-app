import {defineStore} from 'pinia'
import {ref} from 'vue'

import {i18n} from '@/i18n'
import {success} from '@/message'
import type {ISavedView, ISavedViewFilters} from '@/modelTypes/ISavedView'

const STORAGE_KEY = 'vikunja_saved_views'

function isValidView(v: unknown): v is ISavedView {
	if (!v || typeof v !== 'object') return false
	const obj = v as Record<string, unknown>
	return (
		typeof obj.id === 'string' &&
		typeof obj.title === 'string' &&
		typeof obj.projectId === 'number' &&
		obj.filters !== null &&
		typeof obj.filters === 'object'
	)
}

export const useSavedViewsStore = defineStore('savedViews', () => {
	const views = ref<ISavedView[]>([])
	const loadError = ref(false)

	function load() {
		loadError.value = false
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) {
				views.value = []
				return
			}
			const parsed: unknown = JSON.parse(raw)
			if (!Array.isArray(parsed)) {
				console.warn('[savedViews] localStorage data is not an array — resetting')
				views.value = []
				return
			}
			const valid: ISavedView[] = []
			for (let i = 0; i < parsed.length; i++) {
				if (isValidView(parsed[i])) {
					valid.push(parsed[i] as ISavedView)
				} else {
					console.warn('[savedViews] Skipping invalid entry at index', i, ':', parsed[i])
				}
			}
			views.value = valid
		} catch (e) {
			console.warn('[savedViews] Failed to parse localStorage data:', e)
			loadError.value = true
			views.value = []
		}
	}

	function persist() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(views.value))
		} catch (e) {
			console.warn('[savedViews] Could not persist to localStorage:', e)
		}
	}

	function getViewsForProject(projectId: number): ISavedView[] {
		return views.value.filter(v => v.projectId === projectId)
	}

	function saveView(entry: {title: string, projectId: number, filters: ISavedViewFilters}): ISavedView {
		const now = new Date().toISOString()
		const newView: ISavedView = {
			...entry,
			id: `sv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			createdAt: now,
			updatedAt: now,
		}
		views.value = [...views.value, newView]
		persist()
		success({message: i18n.global.t('project.savedViews.saveSuccess')})
		return newView
	}

	function renameView(id: string, title: string) {
		views.value = views.value.map(v =>
			v.id === id
				? {...v, title, updatedAt: new Date().toISOString()}
				: v,
		)
		persist()
		success({message: i18n.global.t('project.savedViews.renameSuccess')})
	}

	function deleteView(id: string) {
		views.value = views.value.filter(v => v.id !== id)
		persist()
		success({message: i18n.global.t('project.savedViews.deleteSuccess')})
	}

	return {
		views,
		loadError,
		load,
		getViewsForProject,
		saveView,
		renameView,
		deleteView,
	}
})
