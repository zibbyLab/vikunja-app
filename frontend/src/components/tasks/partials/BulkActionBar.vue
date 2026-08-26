<template>
	<div class="bulk-action-bar">
		<span class="bulk-action-bar__count">
			{{ $t('task.bulk.selectedCount', taskSelectionStore.selectedCount) }}
		</span>

		<x-button
			:loading="isRunning"
			:disabled="isRunning"
			variant="secondary"
			@click="markDone"
		>
			{{ $t('task.bulk.markDone') }}
		</x-button>
	</div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {useI18n} from 'vue-i18n'

import XButton from '@/components/input/Button.vue'

import type {ITask} from '@/modelTypes/ITask'
import {useTaskStore} from '@/stores/tasks'
import {useTaskSelectionStore} from '@/stores/taskSelection'
import {error} from '@/message'

const props = defineProps<{
	tasks: ITask[],
}>()

const emit = defineEmits<{
	'taskUpdated': [task: ITask],
}>()

const {t} = useI18n({useScope: 'global'})

const taskStore = useTaskStore()
const taskSelectionStore = useTaskSelectionStore()

const isRunning = ref(false)

async function markDone() {
	isRunning.value = true

	const selectedIds = new Set(taskSelectionStore.selectedIds)
	const selectedTasks = props.tasks.filter(t => selectedIds.has(t.id) && !t.done)

	const failureCount = ref(0)

	for (const task of selectedTasks) {
		try {
			const updated = await taskStore.update({...task, done: true})
			emit('taskUpdated', updated)
		} catch {
			failureCount.value++
		}
	}

	if (failureCount.value > 0) {
		error({message: t('task.bulk.errorPartial', failureCount.value)})
	}

	taskSelectionStore.clear()
	isRunning.value = false
}
</script>

<style lang="scss" scoped>
.bulk-action-bar {
	position: sticky;
	bottom: 0;
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: .75rem 1rem;
	background: var(--white);
	border-top: 1px solid var(--grey-200);
	z-index: 10;
}

.bulk-action-bar__count {
	font-weight: 600;
	color: var(--text);
}
</style>
