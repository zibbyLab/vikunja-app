<template>
	<Popup>
		<template #trigger="{toggle}">
			<XButton
				variant="secondary"
				icon="layer-group"
				@click.prevent.stop="toggle()"
			>
				{{ $t('savedViews.title') }}
			</XButton>
		</template>
		<template #content="{close}">
			<Card class="saved-views-popup">
				<!-- Error state -->
				<p
					v-if="store.loadError"
					class="has-text-danger is-size-7 state-msg"
				>
					{{ $t('savedViews.loadError') }}
				</p>

				<template v-else>
					<!-- Empty state -->
					<p
						v-if="store.views.length === 0"
						class="has-text-grey is-size-7 state-msg"
					>
						{{ $t('savedViews.empty') }}
					</p>

					<!-- Views list -->
					<ul
						v-else
						class="saved-views-list"
					>
						<li
							v-for="view in store.views"
							:key="view.id"
							class="saved-view-item"
						>
							<!-- Rename mode -->
							<template v-if="renamingId === view.id">
								<input
									v-model="renameValue"
									class="input is-small rename-input"
									:aria-label="$t('savedViews.rename')"
									@keydown.enter="commitRename(view.id)"
									@keydown.esc="cancelRename"
								/>
								<BaseButton
									class="action-btn"
									:aria-label="$t('misc.save')"
									@click="commitRename(view.id)"
								>
									<Icon icon="check" />
								</BaseButton>
								<BaseButton
									class="action-btn"
									:aria-label="$t('misc.cancel')"
									@click="cancelRename"
								>
									<Icon icon="times" />
								</BaseButton>
							</template>

							<!-- Normal mode -->
							<template v-else>
								<BaseButton
									class="view-name"
									:title="$t('savedViews.apply')"
									@click="applyView(view, close)"
								>
									{{ view.name }}
								</BaseButton>
								<BaseButton
									class="action-btn"
									:aria-label="$t('savedViews.rename')"
									@click="startRename(view)"
								>
									<Icon icon="pen" />
								</BaseButton>
								<BaseButton
									class="action-btn has-text-danger"
									:aria-label="$t('savedViews.delete')"
									@click="store.deleteView(props.projectId, props.viewId, view.id)"
								>
									<Icon icon="trash-alt" />
								</BaseButton>
							</template>
						</li>
					</ul>
				</template>

				<hr class="dropdown-divider" />

				<!-- Save current view -->
				<div
					v-if="!isSaving"
					class="save-trigger"
				>
					<BaseButton @click="startSaving">
						<Icon icon="plus" />
						{{ $t('savedViews.saveCurrentView') }}
					</BaseButton>
				</div>

				<div
					v-else
					class="save-form"
				>
					<input
						ref="saveInputRef"
						v-model="saveName"
						class="input is-small"
						:placeholder="$t('savedViews.saveNamePlaceholder')"
						@keydown.enter="commitSave"
						@keydown.esc="isSaving = false"
					/>
					<div class="save-actions">
						<XButton
							variant="tertiary"
							@click="isSaving = false"
						>
							{{ $t('misc.cancel') }}
						</XButton>
						<XButton
							variant="primary"
							:disabled="!saveName.trim()"
							@click="commitSave"
						>
							{{ $t('misc.save') }}
						</XButton>
					</div>
				</div>
			</Card>
		</template>
	</Popup>
</template>

<script setup lang="ts">
import {ref, nextTick, onMounted} from 'vue'

import Popup from '@/components/misc/Popup.vue'
import Card from '@/components/misc/Card.vue'
import XButton from '@/components/input/Button.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import Icon from '@/components/misc/Icon'

import {useSavedViewsStore, type SavedView} from '@/stores/savedViews'
import type {TaskFilterParams} from '@/services/taskCollection'
import type {SortBy} from '@/composables/useTaskList'
import type {IProject} from '@/modelTypes/IProject'
import type {IProjectView} from '@/modelTypes/IProjectView'

const props = defineProps<{
	projectId: IProject['id']
	viewId: IProjectView['id']
	params: TaskFilterParams
	sortBy: SortBy
}>()

const emit = defineEmits<{
	'update:params': [value: TaskFilterParams]
	'update:sortBy': [value: SortBy]
}>()

const store = useSavedViewsStore()

onMounted(() => {
	store.load(props.projectId, props.viewId)
})

function applyView(view: SavedView, close: () => void) {
	emit('update:params', {...view.params})
	emit('update:sortBy', {...view.sortBy})
	close()
}

// Rename
const renamingId = ref<string | null>(null)
const renameValue = ref('')

function startRename(view: SavedView) {
	renamingId.value = view.id
	renameValue.value = view.name
}

function commitRename(id: string) {
	if (!renameValue.value.trim()) return
	store.renameView(props.projectId, props.viewId, id, renameValue.value)
	renamingId.value = null
}

function cancelRename() {
	renamingId.value = null
}

// Save current view
const isSaving = ref(false)
const saveName = ref('')
const saveInputRef = ref<HTMLInputElement | null>(null)

function startSaving() {
	isSaving.value = true
	saveName.value = ''
	nextTick(() => saveInputRef.value?.focus())
}

function commitSave() {
	if (!saveName.value.trim()) return
	store.saveView(props.projectId, props.viewId, saveName.value, props.params, props.sortBy)
	isSaving.value = false
	saveName.value = ''
}
</script>

<style scoped lang="scss">
.saved-views-popup {
	margin: 0;
	min-inline-size: 18rem;
}

.state-msg {
	padding: .25rem 0;
	margin: 0;
}

.saved-views-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: .125rem;
}

.saved-view-item {
	display: flex;
	align-items: center;
	gap: .25rem;
}

.view-name {
	flex: 1;
	text-align: left;
	font-size: .875rem;
	padding: .25rem .5rem;
	border-radius: $radius;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&:hover {
		background: var(--grey-100);
	}
}

.rename-input {
	flex: 1;
}

.action-btn {
	flex-shrink: 0;
	padding: .25rem;
	color: var(--grey-400);
	font-size: .75rem;

	&:hover {
		color: var(--text);
	}

	&.has-text-danger:hover {
		color: var(--danger) !important;
	}
}

.save-trigger {
	button {
		display: flex;
		align-items: center;
		gap: .5rem;
		font-size: .875rem;
		color: var(--link);
		padding: .25rem 0;

		&:hover {
			color: var(--link-hover);
		}
	}
}

.save-form {
	display: flex;
	flex-direction: column;
	gap: .5rem;
	padding-block-start: .25rem;
}

.save-actions {
	display: flex;
	justify-content: flex-end;
	gap: .5rem;
}

.dropdown-divider {
	background-color: var(--border-light);
	border: none;
	block-size: 1px;
	margin: .5rem 0;
}
</style>
