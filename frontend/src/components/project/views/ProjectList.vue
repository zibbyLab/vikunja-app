<template>
	<ProjectWrapper
		class="project-list"
		:is-loading-project="isLoadingProject"
		:project-id="projectId"
		:view-id
	>
		<template #header>
			<div class="filter-container">
				<SortPopup
					v-model="sortByParam"
				/>
				<FilterPopup
					v-if="!isSavedFilter(project)"
					v-model="params"
					:view-id="viewId"
					:project-id="projectId"
					@update:modelValue="loadTasks()"
				/>
				<!-- Saved views dropdown -->
				<Dropdown class="saved-views-dropdown">
					<template #trigger="{ toggleOpen, open }">
						<BaseButton
							class="saved-views-trigger"
							:aria-expanded="open"
							@click="toggleOpen"
						>
							{{ $t('project.savedViews.title') }}
							<Icon
								icon="chevron-down"
								class="saved-views-icon"
							/>
						</BaseButton>
					</template>
					<template #default="{ close }">
						<div class="saved-views-menu">
							<!-- Error state -->
							<p
								v-if="savedViewsStore.loadError"
								class="saved-views-placeholder"
							>
								{{ $t('project.savedViews.loadError') }}
							</p>
							<!-- Empty state -->
							<p
								v-else-if="projectSavedViews.length === 0"
								class="saved-views-placeholder"
							>
								{{ $t('project.savedViews.empty') }}
							</p>
							<!-- Views list -->
							<template v-else>
								<div
									v-for="view in projectSavedViews"
									:key="view.id"
									class="saved-view-item"
								>
									<template v-if="renamingId === view.id">
										<input
											v-model="renameTitle"
											class="input is-small saved-view-rename-input"
											@keyup.enter="commitRename(view.id)"
											@keyup.escape="cancelRename"
										/>
										<BaseButton
											class="saved-view-action"
											@click.stop="commitRename(view.id)"
										>
											<Icon icon="check" />
										</BaseButton>
										<BaseButton
											class="saved-view-action"
											@click.stop="cancelRename"
										>
											<Icon icon="xmark" />
										</BaseButton>
									</template>
									<template v-else>
										<span
											class="saved-view-title"
											@click="applyView(view); close()"
										>{{ view.title }}</span>
										<BaseButton
											class="saved-view-action"
											:aria-label="$t('project.views.edit')"
											@click.stop="startRename(view)"
										>
											<Icon icon="pencil" />
										</BaseButton>
										<BaseButton
											class="saved-view-action saved-view-action--delete"
											:aria-label="$t('project.views.delete')"
											@click.stop="removeView(view.id)"
										>
											<Icon icon="trash-alt" />
										</BaseButton>
									</template>
								</div>
							</template>

							<!-- Save current filters footer -->
							<div class="saved-views-footer">
								<template v-if="savingNew">
									<input
										v-model="newViewTitle"
										class="input is-small saved-view-rename-input"
										:placeholder="$t('project.savedViews.namePlaceholder')"
										@keyup.enter="saveCurrentFilters"
										@keyup.escape="savingNew = false"
									/>
									<BaseButton
										class="saved-view-action"
										@click.stop="saveCurrentFilters"
									>
										<Icon icon="check" />
									</BaseButton>
									<BaseButton
										class="saved-view-action"
										@click.stop="savingNew = false"
									>
										<Icon icon="xmark" />
									</BaseButton>
								</template>
								<BaseButton
									v-else
									class="saved-views-save-btn"
									@click.stop="savingNew = true"
								>
									{{ $t('project.savedViews.saveCurrentFilters') }}
								</BaseButton>
							</div>
						</div>
					</template>
				</Dropdown>
			</div>
		</template>

		<template #default>
			<div
				:class="{ 'is-loading': loading }"
				class="loader-container is-max-width-desktop list-view"
			>
				<Card
					:padding="false"
					:has-content="false"
					class="has-overflow"
				>
					<AddTask
						v-if="!project?.isArchived && canWrite"
						ref="addTaskRef"
						class="list-view__add-task d-print-none"
						@tasksAdded="updateTaskList"
					/>

					<Nothing v-if="ctaVisible && tasks.length === 0 && !loading">
						{{ $t('project.list.empty') }}
						<ButtonLink
							v-if="project?.id > 0 && canWrite"
							@click="focusNewTaskInput()"
						>
							{{ $t('project.list.newTaskCta') }}
						</ButtonLink>
					</Nothing>

					<draggable
						v-if="tasks && tasks.length > 0"
						v-model="tasks"
						:group="{name: 'tasks', put: false}"
						:disabled="!canDragTasks || !isPositionSorting"
						item-key="id"
						tag="ul"
						:component-data="{
							class: {
								tasks: true,
								'dragging-disabled': !canDragTasks || !isPositionSorting
							},
							type: 'transition-group'
						}"
						:animation="100"
						:handle="dragHandle"
						:delay-on-touch-only="!isTouchDevice"
						:delay="isTouchDevice ? 0 : 1000"
						ghost-class="task-ghost"
						@start="handleDragStart"
						@end="saveTaskPosition"
					>
						<template #item="{element: t, index}">
							<SingleTaskInProject
								:ref="(el) => setTaskRef(el, index)"
								:show-list-color="false"
								:can-mark-as-done="canWrite || isPseudoProject"
								:the-task="t"
								:all-tasks="allTasks"
								@taskUpdated="updateTasks"
							>
								<span
									v-if="canDragTasks && isPositionSorting"
									class="icon handle"
								>
									<Icon icon="grip-lines" />
								</span>
							</SingleTaskInProject>
						</template>
					</draggable>

					<Pagination
						:total-pages="totalPages"
						:current-page="currentPage"
					/>
				</Card>
			</div>
		</template>
	</ProjectWrapper>
</template>


<script setup lang="ts">
import {ref, computed, nextTick, onMounted, onBeforeUnmount, watch, toRef} from 'vue'
import draggable from 'zhyswan-vuedraggable'

import ProjectWrapper from '@/components/project/ProjectWrapper.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import ButtonLink from '@/components/misc/ButtonLink.vue'
import AddTask from '@/components/tasks/AddTask.vue'
import Dropdown from '@/components/misc/Dropdown.vue'
import Icon from '@/components/misc/Icon'
import SingleTaskInProject from '@/components/tasks/partials/SingleTaskInProject.vue'
import FilterPopup from '@/components/project/partials/FilterPopup.vue'
import Nothing from '@/components/misc/Nothing.vue'
import Pagination from '@/components/misc/Pagination.vue'
import SortPopup from '@/components/project/partials/SortPopup.vue'

import {useTaskList} from '@/composables/useTaskList'
import {useTaskDragToProject} from '@/composables/useTaskDragToProject'
import {shouldShowTaskInListView} from '@/composables/useTaskListFiltering'
import {PERMISSIONS as Permissions} from '@/constants/permissions'
import {calculateItemPosition} from '@/helpers/calculateItemPosition'
import type {ITask} from '@/modelTypes/ITask'
import {isSavedFilter, useSavedFilter} from '@/services/savedFilter'
import type {ISavedView} from '@/modelTypes/ISavedView'

import {useBaseStore} from '@/stores/base'
import {useTaskStore} from '@/stores/tasks'
import {useSavedViewsStore} from '@/stores/savedViews'

import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'
import TaskPositionService from '@/services/taskPosition'
import TaskPositionModel from '@/models/taskPosition'

const props = defineProps<{
        isLoadingProject: boolean,
        projectId: IProject['id'],
        viewId: IProjectView['id'],
}>()

const projectId = toRef(props, 'projectId')

defineOptions({name: 'List'})

const ctaVisible = ref(false)

const drag = ref(false)

const {
	tasks: allTasks,
	loading,
	totalPages,
	currentPage,
	loadTasks,
	params,
	sortByParam,
} = useTaskList(
	() => projectId.value,
	() => props.viewId,
	{position: 'asc'},
	() => projectId.value === -1
		? ['comment_count', 'is_unread']
		: ['subtasks', 'comment_count', 'is_unread'],
)

const taskPositionService = ref(new TaskPositionService())

// Saved filter composable for accessing filter data
const _savedFilter = useSavedFilter(() => isSavedFilter({id: projectId.value}) ? projectId.value : undefined).filter

const tasks = ref<ITask[]>([])
watch(
	allTasks,
	() => {
		tasks.value = ([...allTasks.value]).filter(t => shouldShowTaskInListView(t, allTasks.value))
	},
)

const isPositionSorting = computed(() => 'position' in sortByParam.value)

const baseStore = useBaseStore()
const taskStore = useTaskStore()
const savedViewsStore = useSavedViewsStore()
const {handleTaskDropToProject} = useTaskDragToProject()
const project = computed(() => baseStore.currentProject)

// --- Saved views ---
const projectSavedViews = computed(() => savedViewsStore.getViewsForProject(projectId.value))

const renamingId = ref<string | null>(null)
const renameTitle = ref('')
const savingNew = ref(false)
const newViewTitle = ref('')

function startRename(view: ISavedView) {
	renamingId.value = view.id
	renameTitle.value = view.title
}

function commitRename(id: string) {
	const title = renameTitle.value.trim()
	if (!title) return
	savedViewsStore.renameView(id, title)
	renamingId.value = null
}

function cancelRename() {
	renamingId.value = null
}

function removeView(id: string) {
	savedViewsStore.deleteView(id)
}

function applyView(view: ISavedView) {
	params.value = {
		...params.value,
		filter: view.filters.filter,
		filter_include_nulls: view.filters.filter_include_nulls,
		s: view.filters.s,
	}
	loadTasks()
}

function saveCurrentFilters() {
	const title = newViewTitle.value.trim()
	if (!title) return
	savedViewsStore.saveView({
		title,
		projectId: projectId.value,
		filters: {
			filter: params.value.filter,
			filter_include_nulls: params.value.filter_include_nulls,
			s: params.value.s,
		},
	})
	newViewTitle.value = ''
	savingNew.value = false
}

const canWrite = computed(() => {
	return project.value?.maxPermission > Permissions.READ && project.value?.id > 0
})

const isPseudoProject = computed(() => (project.value && isSavedFilter(project.value)) || project.value?.id === -1)

onMounted(async () => {
	await nextTick()
	ctaVisible.value = true
	savedViewsStore.load()
})

const canDragTasks = computed(() => canWrite.value || isSavedFilter(project.value))

const isTouchDevice = ref(false)
if (typeof window !== 'undefined') {
	isTouchDevice.value = !window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
const dragHandle = computed(() => isTouchDevice.value ? '.handle' : undefined)

const addTaskRef = ref<typeof AddTask | null>(null)

function focusNewTaskInput() {
	addTaskRef.value?.focusTaskInput()
}

function updateTaskList(newTasks: ITask[]) {
	if (!isPositionSorting.value) {
		// reload tasks with current filter and sorting
		loadTasks()
	} else {
		allTasks.value = [
			...newTasks,
			...allTasks.value,
		]
	}

	baseStore.setHasTasks(true)
}

function updateTasks(updatedTask: ITask) {
	if (projectId.value < 0) {
		// Reload tasks to keep saved filter results in sync
		loadTasks(false)
		return
	}

	for (let t = 0; t < tasks.value.length; t++) {
		if (tasks.value[t].id === updatedTask.id) {
			tasks.value[t] = updatedTask
			break
		}
	}
}

function handleDragStart(e: { item: HTMLElement }) {
	drag.value = true
	const taskId = parseInt(e.item.dataset.taskId ?? '', 10)
	const task = tasks.value.find(t => t.id === taskId)

	if (task) {
		taskStore.setDraggedTask(task)
	}
}

async function saveTaskPosition(e: { originalEvent?: MouseEvent, to: HTMLElement, from: HTMLElement, newIndex: number }) {
	drag.value = false

	// Check if dropped on a sidebar project
	const {moved} = await handleTaskDropToProject(e, (task) => {
		tasks.value = tasks.value.filter(t => t.id !== task.id)
	})

	if (moved) {
		return
	}

	// If dropped outside this list
	if (e.to !== e.from) {
		return
	}

	const task = tasks.value[e.newIndex]
	const taskBefore = tasks.value[e.newIndex - 1] ?? null
	const taskAfter = tasks.value[e.newIndex + 1] ?? null

	const position = calculateItemPosition(taskBefore !== null ? taskBefore.position : null, taskAfter !== null ? taskAfter.position : null)

	await taskPositionService.value.update(new TaskPositionModel({
		position,
		projectViewId: props.viewId,
		taskId: task.id,
	}))
	tasks.value[e.newIndex] = {
		...task,
		position,
	}
}

const taskRefs = ref<(InstanceType<typeof SingleTaskInProject> | null)[]>([])
const focusedIndex = ref(-1)

function setTaskRef(el: InstanceType<typeof SingleTaskInProject> | null, index: number) {
	if (el === null) {
		delete taskRefs.value[index]
	} else {
		taskRefs.value[index] = el
	}
}

function focusTask(index: number) {
	if (index < 0 || index >= tasks.value.length) {
		return
	}

	const taskRef = taskRefs.value[index]

	focusedIndex.value = index
	taskRef?.focus()
}

function handleListNavigation(e: KeyboardEvent) {
	if (e.target instanceof HTMLElement && (e.target.closest('input, textarea, select, [contenteditable="true"]'))) {
		return
	}

	if (e.code === 'KeyJ') {
		e.preventDefault()
		focusTask(Math.min(focusedIndex.value + 1, tasks.value.length - 1))
		return
	}

	if (e.code === 'KeyK') {
		e.preventDefault()
		if (focusedIndex.value === -1) {
			focusTask(tasks.value.length - 1)
			return
		}

		if (focusedIndex.value === 0) {
			addTaskRef.value?.focusTaskInput()
			focusedIndex.value = -1
			return
		}

		focusTask(Math.max(focusedIndex.value - 1, 0))
		return
	}

	if (e.code === 'Enter') {
		if (e.isComposing) {
			return
		}

		// Links and buttons activate natively on Enter; leave them alone
		if (e.target instanceof HTMLElement && e.target.closest('a, button, [role="button"]')) {
			return
		}

		// Only act when a row was focused via J/K roving navigation
		if (focusedIndex.value < 0) {
			return
		}

		e.preventDefault()
		taskRefs.value[focusedIndex.value]?.click(e)
	}
}

onMounted(() => {
	document.addEventListener('keydown', handleListNavigation)
})

onBeforeUnmount(() => {
	document.removeEventListener('keydown', handleListNavigation)
})
</script>

<style lang="scss" scoped>
.filter-container {
	display: flex;
	align-items: center;
	gap: .5rem;

	:deep(.popup) {
		inset-block-start: 3rem;
		inset-inline-end: 0;
		max-inline-size: 300px;
	}
}

.saved-views-trigger {
	display: inline-flex;
	align-items: center;
	gap: .25rem;
	font-size: .75rem;
	padding: .25rem .5rem;
	border-radius: $radius;
	background: var(--white);
	box-shadow: var(--shadow-sm);
	color: var(--text);

	&:hover {
		background: var(--grey-100);
	}
}

.saved-views-icon {
	font-size: .6rem;
}

.saved-views-menu {
	min-inline-size: 14rem;
	padding: .25rem 0;
}

.saved-views-placeholder {
	padding: .5rem 1rem;
	color: var(--grey-500);
	font-size: .85rem;
}

.saved-view-item {
	display: flex;
	align-items: center;
	gap: .25rem;
	padding: .25rem .5rem;

	&:hover {
		background: var(--grey-100);
	}
}

.saved-view-title {
	flex: 1;
	cursor: pointer;
	padding: .125rem .25rem;
	font-size: .875rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.saved-view-rename-input {
	flex: 1;
	min-inline-size: 0;
}

.saved-view-action {
	flex-shrink: 0;
	padding: .25rem .375rem;
	font-size: .75rem;
	color: var(--grey-500);
	border-radius: $radius;

	&:hover {
		color: var(--text);
		background: var(--grey-200);
	}

	&--delete:hover {
		color: var(--danger);
	}
}

.saved-views-footer {
	display: flex;
	align-items: center;
	gap: .25rem;
	padding: .375rem .5rem;
	border-block-start: 1px solid var(--border-light);
	margin-block-start: .25rem;
}

.saved-views-save-btn {
	font-size: .8rem;
	color: var(--primary);
	padding: .125rem .25rem;

	&:hover {
		text-decoration: underline;
	}
}

.tasks {
	padding: .5rem;
}

.task-ghost {
	border-radius: $radius;
	background: var(--grey-100);
	border: 2px dashed var(--grey-300);

	* {
		opacity: 0;
	}
}

.list-view__add-task {
	padding: 1rem 1rem 0;
}

.link-share-view .card {
	border: none;
	box-shadow: none;
}

:deep(.single-task .handle) {
	cursor: grab;
	margin-inline-end: .25rem;
	color: var(--grey-400);
}

@media (hover: hover) and (pointer: fine) {
	:deep(.single-task .handle) {
		display: none;
	}
}

:deep(.tasks:not(.dragging-disabled) .single-task) {
	cursor: grab;
	-webkit-touch-callout: none;
	user-select: none;
	touch-action: manipulation;

	&:active {
		cursor: grabbing;
	}
}

.list-view {
	padding-block-end: 1rem;

	:deep(.card) {
		margin-block-end: 0;
	}
}
</style>
