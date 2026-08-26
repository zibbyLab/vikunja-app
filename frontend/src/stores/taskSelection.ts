import {computed, ref} from 'vue'
import {acceptHMRUpdate, defineStore} from 'pinia'

import type {ITask} from '@/modelTypes/ITask'

export const useTaskSelectionStore = defineStore('taskSelection', () => {
	const selectedTasks = ref<Record<ITask['id'], ITask>>({})

	const selectedCount = computed(() => Object.keys(selectedTasks.value).length)
	const hasSelection = computed(() => selectedCount.value > 0)
	const tasks = computed(() => Object.values(selectedTasks.value))

	function isSelected(taskId: ITask['id']) {
		return typeof selectedTasks.value[taskId] !== 'undefined'
	}

	function select(task: ITask) {
		selectedTasks.value[task.id] = task
	}

	function deselect(taskId: ITask['id']) {
		delete selectedTasks.value[taskId]
	}

	function toggle(task: ITask, selected = !isSelected(task.id)) {
		if (selected) {
			select(task)
			return
		}

		deselect(task.id)
	}

	function setSelected(tasksToSelect: ITask[]) {
		selectedTasks.value = tasksToSelect.reduce<Record<ITask['id'], ITask>>((selected, task) => {
			selected[task.id] = task
			return selected
		}, {})
	}

	function clear() {
		selectedTasks.value = {}
	}

	return {
		selectedTasks,
		selectedCount,
		hasSelection,
		tasks,
		isSelected,
		select,
		deselect,
		toggle,
		setSelected,
		clear,
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useTaskSelectionStore, import.meta.hot))
}
