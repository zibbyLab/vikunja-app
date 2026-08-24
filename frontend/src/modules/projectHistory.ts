import {ref} from 'vue'

export interface ProjectHistory {
	id: number;
}

// Module-level reactive ref so Vue components can react to history changes
// without polling localStorage. Every write function keeps this in sync.
export const historyRef = ref<ProjectHistory[]>(
	JSON.parse(localStorage.getItem('projectHistory') ?? '[]'),
)

export function getHistory(): ProjectHistory[] {
	const savedHistory = localStorage.getItem('projectHistory')
	if (savedHistory === null) {
		return []
	}

	return JSON.parse(savedHistory)
}

function saveHistory(history: ProjectHistory[]) {
	if (history.length === 0) {
		localStorage.removeItem('projectHistory')
		return
	}

	localStorage.setItem('projectHistory', JSON.stringify(history))
}

const MAX_SAVED_PROJECTS = 6

export function saveProjectToHistory(project: ProjectHistory) {
	const history: ProjectHistory[] = getHistory()

	// Remove the element if it already exists in history, preventing duplicates and essentially moving it to the beginning
	history.forEach((l, i) => {
		if (l.id === project.id) {
			history.splice(i, 1)
		}
	})

	// Add the new project to the beginning of the project
	history.unshift(project)

	if (history.length > MAX_SAVED_PROJECTS) {
		history.pop()
	}
	historyRef.value = [...history]
	saveHistory(history)
}

export function removeProjectFromHistory(project: ProjectHistory) {
	const history: ProjectHistory[] = getHistory()

	history.forEach((l, i) => {
		if (l.id === project.id) {
			history.splice(i, 1)
		}
	})
	historyRef.value = [...history]
	saveHistory(history)
}

export function clearHistory() {
	historyRef.value = []
	saveHistory([])
}
