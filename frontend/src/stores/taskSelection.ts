import {ref, computed} from 'vue'
import {acceptHMRUpdate, defineStore} from 'pinia'

import type {ITask} from '@/modelTypes/ITask'
import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'

export const useTaskSelectionStore = defineStore('taskSelection', () => {
	const selectedIds = ref<Set<ITask['id']>>(new Set())
	const currentProjectId = ref<IProject['id'] | null>(null)
	const currentViewId = ref<IProjectView['id'] | null>(null)

	const selectedCount = computed(() => selectedIds.value.size)
	const hasSelection = computed(() => selectedIds.value.size > 0)

	function select(id: ITask['id']) {
		selectedIds.value.add(id)
	}

	function deselect(id: ITask['id']) {
		selectedIds.value.delete(id)
	}

	function toggle(id: ITask['id']) {
		if (selectedIds.value.has(id)) {
			selectedIds.value.delete(id)
		} else {
			selectedIds.value.add(id)
		}
	}

	function clear() {
		selectedIds.value.clear()
	}

	function isSelected(id: ITask['id']): boolean {
		return selectedIds.value.has(id)
	}

	function setCurrentList(projectId: IProject['id'], viewId: IProjectView['id']) {
		if (projectId !== currentProjectId.value || viewId !== currentViewId.value) {
			clear()
			currentProjectId.value = projectId
			currentViewId.value = viewId
		}
	}

	return {
		selectedIds,
		selectedCount,
		hasSelection,
		select,
		deselect,
		toggle,
		clear,
		isSelected,
		setCurrentList,
	}
})

// support hot reloading
if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useTaskSelectionStore, import.meta.hot))
}
