import {ref} from 'vue'

export interface ProjectHistory {
	id: number;
}

function loadFromStorage(): ProjectHistory[] {
	const savedHistory = localStorage.getItem('projectHistory')
	if (savedHistory === null) {
		return []
	}

	return JSON.parse(savedHistory)
}

// Reactive ref so computed properties in components (e.g. the sidebar's
// "Recently viewed" section) update automatically when history changes.
const historyState = ref<ProjectHistory[]>(loadFromStorage())

export function getHistory(): ProjectHistory[] {
	return historyState.value
}

function saveHistory(history: ProjectHistory[]) {
	if (history.length === 0) {
		localStorage.removeItem('projectHistory')
	} else {
		localStorage.setItem('projectHistory', JSON.stringify(history))
	}
	historyState.value = [...history]
}

const MAX_SAVED_PROJECTS = 6

export function saveProjectToHistory(project: ProjectHistory) {
	const history: ProjectHistory[] = [...historyState.value]

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
	saveHistory(history)
}

export function removeProjectFromHistory(project: ProjectHistory) {
	const history: ProjectHistory[] = [...historyState.value]

	history.forEach((l, i) => {
		if (l.id === project.id) {
			history.splice(i, 1)
		}
	})
	saveHistory(history)
}
