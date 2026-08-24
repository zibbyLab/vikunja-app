import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'

const STORAGE_KEY = 'lastAppliedViewId'

type LastAppliedViews = Record<IProject['id'], IProjectView['id']>

/**
 * Persists the last view (by viewId) the user explicitly applied to each project
 * so that filter params can be restored on the next project revisit.
 */
export function useSavedViews() {
	function getLastAppliedViewId(projectId: IProject['id']): IProjectView['id'] | null {
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			if (!raw) return null
			const stored = JSON.parse(raw) as LastAppliedViews
			return stored[projectId] ?? null
		} catch {
			return null
		}
	}

	function setLastAppliedViewId(projectId: IProject['id'], viewId: IProjectView['id']) {
		try {
			const raw = localStorage.getItem(STORAGE_KEY)
			const stored: LastAppliedViews = raw ? JSON.parse(raw) : {}
			stored[projectId] = viewId
			localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
		} catch {
			// localStorage may be unavailable (e.g. private browsing with strict settings)
		}
	}

	return {getLastAppliedViewId, setLastAppliedViewId}
}
