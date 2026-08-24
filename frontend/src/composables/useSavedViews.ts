import {ref} from 'vue'
import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'

const LS_KEY = 'vikunja-last-applied-view-id'

function loadFromStorage(): Record<number, number> {
	try {
		const raw = localStorage.getItem(LS_KEY)
		return raw ? JSON.parse(raw) : {}
	} catch {
		return {}
	}
}

function saveToStorage(map: Record<number, number>) {
	try {
		localStorage.setItem(LS_KEY, JSON.stringify(map))
	} catch {
		// storage unavailable — silently ignore
	}
}

// Module-level ref so every composable call shares the same reactive state.
const lastAppliedViewIds = ref<Record<IProject['id'], IProjectView['id']>>(loadFromStorage())

export function useSavedViews() {
	function setLastAppliedViewId(projectId: IProject['id'], viewId: IProjectView['id']) {
		lastAppliedViewIds.value = {
			...lastAppliedViewIds.value,
			[projectId]: viewId,
		}
		saveToStorage(lastAppliedViewIds.value)
	}

	function getLastAppliedViewId(projectId: IProject['id']): IProjectView['id'] | undefined {
		return lastAppliedViewIds.value[projectId]
	}

	function clearLastAppliedViewId(projectId: IProject['id']) {
		const next = {...lastAppliedViewIds.value}
		delete next[projectId]
		lastAppliedViewIds.value = next
		saveToStorage(lastAppliedViewIds.value)
	}

	return {
		lastAppliedViewIds,
		setLastAppliedViewId,
		getLastAppliedViewId,
		clearLastAppliedViewId,
	}
}
