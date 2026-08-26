<template>
	<div class="bulk-action-bar">
		<span class="bulk-action-bar__count">
			{{ $t('task.bulk.selected', selectedCount) }}
		</span>

		<XButton
			icon="check"
			:loading="isUpdating"
			:disabled="isUpdating"
			@click="markSelectedDone"
		>
			{{ $t('task.bulk.markDone') }}
		</XButton>
	</div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'

import {runWrites} from '@/helpers/runWrites'
import {error, success} from '@/message'
import type {ITask} from '@/modelTypes/ITask'
import {useTaskSelectionStore} from '@/stores/taskSelection'
import {useTaskStore} from '@/stores/tasks'

const emit = defineEmits<{
	'taskUpdated': [task: ITask],
}>()

const {t} = useI18n({useScope: 'global'})
const selectionStore = useTaskSelectionStore()
const taskStore = useTaskStore()

const isUpdating = ref(false)
const selectedCount = computed(() => selectionStore.selectedCount)

async function markSelectedDone() {
	if (isUpdating.value) {
		return
	}

	isUpdating.value = true
	const failures: ITask[] = []
	const tasksToUpdate = [...selectionStore.tasks].filter(task => !task.done)

	try {
		await runWrites(tasksToUpdate, async task => {
			try {
				const updatedTask = await taskStore.update({
					...task,
					done: true,
				})
				emit('taskUpdated', updatedTask)
			} catch {
				failures.push(task)
			}
		}, false)

		if (failures.length > 0) {
			error({message: t('task.bulk.markDoneError', failures.length)})
		} else if (tasksToUpdate.length > 0) {
			success({message: t('task.bulk.markDoneSuccess', tasksToUpdate.length)})
		}
	} finally {
		selectionStore.clear()
		isUpdating.value = false
	}
}
</script>

<style lang="scss" scoped>
.bulk-action-bar {
	position: sticky;
	inset-block-end: 1rem;
	z-index: 5;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin: .5rem 1rem 1rem;
	padding: .75rem;
	border: 1px solid var(--grey-200);
	border-radius: $radius;
	background: var(--white);
	box-shadow: var(--shadow-md);
}

.bulk-action-bar__count {
	font-weight: 600;
	color: var(--text);
}

@media (max-width: $tablet) {
	.bulk-action-bar {
		align-items: stretch;
		flex-direction: column;
	}
}
</style>
