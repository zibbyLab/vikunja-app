<template>
	<Dropdown>
		<template #trigger="{ toggleOpen }">
			<XButton
				variant="secondary"
				icon="list-check"
				:class="{'has-active-view': activeViewId !== undefined}"
				@click="toggleOpen"
			>
				{{ $t('project.savedViews.label') }}
				<Icon
					v-if="activeViewId !== undefined"
					icon="check"
					class="active-indicator"
				/>
			</XButton>
		</template>

		<template #default="{ close }">
			<p
				v-if="views.length === 0"
				class="saved-views-empty"
			>
				{{ $t('project.savedViews.empty') }}
			</p>

			<div
				v-for="view in views"
				:key="view.id"
				class="saved-view-row"
				:class="{'is-active': view.id === activeViewId}"
			>
				<!-- Inline rename input -->
				<input
					v-if="renamingViewId === view.id"
					ref="renameInputRef"
					v-model="renameTitle"
					class="rename-input"
					type="text"
					@keydown.enter.prevent="confirmRename(view)"
					@keydown.escape.prevent="cancelRename"
					@blur="confirmRename(view)"
				/>
				<BaseButton
					v-else
					class="saved-view-title"
					@click="applyView(view, close)"
				>
					<Icon
						v-if="view.id === activeViewId"
						icon="check"
						class="active-check"
					/>
					<span>{{ view.title }}</span>
				</BaseButton>

				<span class="saved-view-actions">
					<BaseButton
						v-if="renamingViewId !== view.id"
						class="icon-btn"
						:aria-label="$t('project.savedViews.rename')"
						@click.stop="startRename(view)"
					>
						<Icon icon="pencil" />
					</BaseButton>
					<BaseButton
						class="icon-btn has-text-danger"
						:aria-label="$t('project.savedViews.delete')"
						:disabled="deleteLoading === view.id"
						@click.stop="confirmDelete(view)"
					>
						<Icon icon="trash-alt" />
					</BaseButton>
				</span>
			</div>
		</template>
	</Dropdown>

	<!-- Delete confirmation modal -->
	<Modal
		:enabled="showDeleteModal"
		@close="showDeleteModal = false"
		@submit="doDelete"
	>
		<template #header>
			{{ $t('project.savedViews.deleteTitle') }}
		</template>
		<template #text>
			{{ $t('project.savedViews.deleteText') }}
		</template>
	</Modal>
</template>

<script setup lang="ts">
import {ref, computed, nextTick} from 'vue'

import Dropdown from '@/components/misc/Dropdown.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import XButton from '@/components/input/Button.vue'
import Modal from '@/components/misc/Modal.vue'

import {useProjectStore} from '@/stores/projects'
import {useSavedViews} from '@/composables/useSavedViews'
import ProjectViewService from '@/services/projectViews'
import ProjectViewModel from '@/models/projectView'
import {error, success} from '@/message'
import {useI18n} from 'vue-i18n'

import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'
import type {SortBy} from '@/composables/useTaskList'

const props = defineProps<{
	projectId: IProject['id']
}>()

const emit = defineEmits<{
	'applyView': [filter: string, s: string, sortBy: SortBy]
}>()

const {t} = useI18n()
const projectStore = useProjectStore()
const {setLastAppliedViewId, getLastAppliedViewId, clearLastAppliedViewId} = useSavedViews()

const views = computed<IProjectView[]>(() => projectStore.projects[props.projectId]?.views ?? [])

const activeViewId = computed<IProjectView['id'] | undefined>(() => getLastAppliedViewId(props.projectId))

// ---- Apply ----------------------------------------------------------------

function viewFilterToSortBy(view: IProjectView): SortBy {
	const f = view.filter
	if (!f?.sort_by?.length) return {}
	const sb: SortBy = {}
	f.sort_by.forEach((field, i) => {
		const order = f.order_by?.[i]
		if (order === 'asc' || order === 'desc') {
			(sb as Record<string, string>)[field] = order
		}
	})
	return sb
}

function applyView(view: IProjectView, close: () => void) {
	emit('applyView', view.filter?.filter ?? '', view.filter?.s ?? '', viewFilterToSortBy(view))
	setLastAppliedViewId(props.projectId, view.id)
	close()
}

// ---- Rename ---------------------------------------------------------------

const renamingViewId = ref<IProjectView['id'] | null>(null)
const renameTitle = ref('')
// When ref is inside v-for, Vue collects an array of elements.
const renameInputRef = ref<HTMLInputElement[]>([])
const renameLoading = ref(false)

function startRename(view: IProjectView) {
	renamingViewId.value = view.id
	renameTitle.value = view.title
	nextTick(() => renameInputRef.value[0]?.focus())
}

function cancelRename() {
	renamingViewId.value = null
	renameTitle.value = ''
}

async function confirmRename(view: IProjectView) {
	if (renamingViewId.value === null) return
	const title = renameTitle.value.trim()
	if (!title || title === view.title) {
		cancelRename()
		return
	}
	if (renameLoading.value) return
	renameLoading.value = true
	try {
		const svc = new ProjectViewService()
		const updated = await svc.update(new ProjectViewModel({...view, title}))
		projectStore.setProjectView(updated)
		success({message: t('project.views.updateSuccess')})
	} catch (e) {
		error(e)
	} finally {
		renameLoading.value = false
		cancelRename()
	}
}

// ---- Delete ---------------------------------------------------------------

const showDeleteModal = ref(false)
const viewToDelete = ref<IProjectView | null>(null)
const deleteLoading = ref<IProjectView['id'] | null>(null)

function confirmDelete(view: IProjectView) {
	viewToDelete.value = view
	showDeleteModal.value = true
}

async function doDelete() {
	if (!viewToDelete.value) return
	const view = viewToDelete.value
	deleteLoading.value = view.id
	showDeleteModal.value = false
	try {
		const svc = new ProjectViewService()
		await svc.delete(new ProjectViewModel({id: view.id, projectId: props.projectId}))
		projectStore.removeProjectView(props.projectId, view.id)
		if (getLastAppliedViewId(props.projectId) === view.id) {
			clearLastAppliedViewId(props.projectId)
		}
		success({message: t('project.views.deleteSuccess')})
	} catch (e) {
		error(e)
	} finally {
		deleteLoading.value = null
		viewToDelete.value = null
	}
}
</script>

<style scoped lang="scss">
.saved-views-empty {
	padding: .5rem 1rem;
	color: var(--grey-400);
	font-size: .875rem;
	white-space: nowrap;
	margin: 0;
}

.saved-view-row {
	display: flex;
	align-items: center;
	padding: 0 .25rem;

	&.is-active {
		background-color: var(--primary-light, hsla(221, 100%, 55%, .08));
	}

	&:hover:not(.is-active) {
		background-color: var(--grey-100);
	}
}

.saved-view-title {
	display: flex;
	align-items: center;
	gap: .4rem;
	flex: 1;
	padding: $item-padding;
	font-size: .875rem;
	text-align: left;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--text);
}

.active-check {
	color: var(--primary);
	font-size: .75rem;
	flex-shrink: 0;
}

.saved-view-actions {
	display: flex;
	align-items: center;
	gap: .1rem;
	flex-shrink: 0;
	opacity: 0;
	transition: opacity .15s;

	.saved-view-row:hover & {
		opacity: 1;
	}
}

.icon-btn {
	padding: .25rem .4rem;
	color: var(--grey-500);
	border-radius: $radius;

	&:hover {
		background-color: var(--grey-200);
		color: var(--text);
	}

	&.has-text-danger:hover {
		background-color: var(--danger-light, hsla(348, 100%, 61%, .1));
		color: var(--danger) !important;
	}
}

.rename-input {
	flex: 1;
	margin: .25rem .5rem;
	padding: .25rem .5rem;
	font-size: .875rem;
	border: 1px solid var(--primary);
	border-radius: $radius;
	background: var(--scheme-main);
	color: var(--text);
	outline: none;
}

.active-indicator {
	margin-inline-start: .25rem;
	font-size: .75rem;
	color: var(--primary);
}

:deep(.has-active-view) {
	border-color: var(--primary);
	color: var(--primary);
}
</style>
