import {defineStore} from 'pinia'
import {ref} from 'vue'
import type {IProject} from '@/modelTypes/IProject'
import type {ISavedView, SavedViewFilterParams} from '@/modelTypes/ISavedView'

const STORAGE_KEY = 'vikunja_saved_views'

interface PersistedState {
	views: Record<IProject['id'], ISavedView[]>
	lastApplied: Record<IProject['id'], string>
}

function loadFromStorage(): PersistedState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) {
			return JSON.parse(raw)
		}
	} catch {
		// ignore corrupt/missing data
	}
	return {views: {}, lastApplied: {}}
}

export const useSavedViewsStore = defineStore('savedViews', () => {
	const initial = loadFromStorage()
	const views = ref<Record<IProject['id'], ISavedView[]>>(initial.views)
	const lastApplied = ref<Record<IProject['id'], string>>(initial.lastApplied)

	function persist() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({
			views: views.value,
			lastApplied: lastApplied.value,
		}))
	}

	function addSavedView(projectId: IProject['id'], name: string, filterParams: SavedViewFilterParams): ISavedView {
		const view: ISavedView = {
			id: crypto.randomUUID(),
			name,
			filterParams,
		}
		if (!views.value[projectId]) {
			views.value[projectId] = []
		}
		views.value[projectId].push(view)
		persist()
		return view
	}

	function updateSavedView(projectId: IProject['id'], viewId: string, newName: string) {
		const view = views.value[projectId]?.find(v => v.id === viewId)
		if (view) {
			view.name = newName
			persist()
		}
	}

	function deleteSavedView(projectId: IProject['id'], viewId: string) {
		const list = views.value[projectId]
		if (!list) return
		views.value[projectId] = list.filter(v => v.id !== viewId)
		persist()
	}

	function getSavedViews(projectId: IProject['id']): ISavedView[] {
		return views.value[projectId] ?? []
	}

	function getSavedView(projectId: IProject['id'], viewId: string): ISavedView | undefined {
		return views.value[projectId]?.find(v => v.id === viewId)
	}

	function setLastAppliedViewId(projectId: IProject['id'], viewId: string) {
		lastApplied.value[projectId] = viewId
		persist()
	}

	function getLastAppliedViewId(projectId: IProject['id']): string | undefined {
		return lastApplied.value[projectId]
	}

	return {
		views,
		lastApplied,
		addSavedView,
		updateSavedView,
		deleteSavedView,
		getSavedViews,
		getSavedView,
		setLastAppliedViewId,
		getLastAppliedViewId,
	}
})
