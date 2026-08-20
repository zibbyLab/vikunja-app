<template>
	<div
		:class="{ 'is-loading': loading}"
		class="loader-container"
	>
		<XButton
			:to="{name:'labels.create'}"
			class="is-pulled-end"
			icon="plus"
		>
			{{ $t('label.create.header') }}
		</XButton>

		<div class="content">
			<h1>{{ $t('label.manage') }}</h1>
			<p v-if="labelStore.labelsArray.length > 0">
				{{ $t('label.description') }}
			</p>
			<p
				v-else
				class="has-text-centered has-text-grey is-italic"
			>
				{{ $t('label.newCTA') }}
				<RouterLink :to="{name:'labels.create'}">
					{{ $t('label.create.title') }}.
				</RouterLink>
			</p>
		</div>

		<!-- Bulk action bar – shown only when ≥1 label is selected -->
		<div
			v-if="selectedIds.size > 0"
			v-cy="'label-bulk-bar'"
			class="label-bulk-bar"
		>
			<span class="label-bulk-count">{{ $t('label.bulk.selected', selectedIds.size) }}</span>
			<XButton
				v-cy="'label-bulk-delete'"
				danger
				@click="openBulkConfirm"
			>
				{{ $t('label.bulk.deleteSelected') }}
			</XButton>
		</div>

		<div class="columns">
			<div class="labels-list column">
				<!-- Select all – only shown when there are labels -->
				<div
					v-if="labelStore.labelsArray.length > 0"
					class="label-select-all-row"
				>
					<input
						ref="selectAllRef"
						v-cy="'label-select-all'"
						type="checkbox"
						:checked="allSelected"
						@change="toggleSelectAll"
					/>
				</div>

				<!-- One row per label: checkbox + chip -->
				<div
					v-for="label in labelStore.labelsArray"
					:key="label.id"
					class="label-chip-row"
				>
					<input
						v-cy="'label-select'"
						type="checkbox"
						:checked="selectedIds.has(label.id)"
						@change="toggleLabel(label.id)"
					/>
					<RouterLink
						:to="{name: 'home', query: {labels: label.id.toString()}}"
						:style="getLabelStyles(label)"
						class="tag"
					>
						<span>{{ label.title }}</span>
						<BaseButton
							v-if="userInfo.id === label.createdBy.id"
							class="label-edit-button is-small"
							:aria-label="$t('label.edit.header')"
							@click.stop.prevent="editLabel(label)"
						>
							<Icon
								icon="pen"
								class="icon"
							/>
						</BaseButton>
					</RouterLink>
				</div>
			</div>

			<!-- Single-label edit card (existing behaviour, unchanged) -->
			<div
				v-if="isLabelEdit"
				class="column is-4"
			>
				<Card
					:title="$t('label.edit.header')"
					:show-close="true"
					@close="() => isLabelEdit = false"
				>
					<form @submit.prevent="editLabelSubmit()">
						<FormField
							v-model="labelEditLabel.title"
							:label="$t('label.attributes.title')"
							:placeholder="$t('label.attributes.titlePlaceholder')"
							type="text"
						/>
						<FormField :label="$t('label.attributes.description')">
							<Editor
								v-if="editorActive"
								v-model="labelEditLabel.description"
								:placeholder="$t('label.attributes.description')"
							/>
						</FormField>
						<FormField :label="$t('label.attributes.color')">
							<ColorPicker v-model="labelEditLabel.hexColor" />
						</FormField>
						<div class="field has-addons">
							<div class="control is-expanded">
								<XButton
									:loading="loading"
									class="is-fullwidth"
									type="submit"
								>
									{{ $t('misc.save') }}
								</XButton>
							</div>
							<div class="control">
								<XButton
									icon="trash-alt"
									danger
									:aria-label="$t('task.label.delete.header')"
									@click="showDeleteDialoge(labelEditLabel)"
								/>
							</div>
						</div>
					</form>
				</Card>
			</div>

			<!-- Single-label delete confirmation modal (existing, unchanged) -->
			<Modal
				:enabled="showDeleteModal"
				@close="showDeleteModal = false"
				@submit="deleteLabel(labelToDelete)"
			>
				<template #header>
					<span>{{ $t('task.label.delete.header') }}</span>
				</template>

				<template #text>
					<p>
						{{ $t('task.label.delete.text1') }}<br>
						{{ $t('task.label.delete.text2') }}
					</p>
				</template>
			</Modal>
		</div>

		<!-- Bulk-delete confirmation dialog
		     v-cy targets the <dialog> DOM element directly so data-cy is set on it. -->
		<dialog
			ref="bulkConfirmRef"
			v-cy="'label-bulk-confirm'"
			class="label-bulk-confirm"
			@cancel.prevent="cancelBulkDelete"
		>
			<p class="label-bulk-confirm-text">
				{{ $t('label.bulk.confirmDelete', selectedIds.size) }}
			</p>
			<div class="label-bulk-confirm-actions">
				<XButton
					variant="tertiary"
					@click="cancelBulkDelete"
				>
					{{ $t('misc.cancel') }}
				</XButton>
				<XButton
					danger
					@click="confirmBulkDelete"
				>
					{{ $t('misc.delete') }}
				</XButton>
			</div>
		</dialog>
	</div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watchEffect} from 'vue'
import {useI18n} from 'vue-i18n'

import BaseButton from '@/components/base/BaseButton.vue'
import Editor from '@/components/input/AsyncEditor'
import ColorPicker from '@/components/input/ColorPicker.vue'
import FormField from '@/components/input/FormField.vue'

import LabelModel from '@/models/label'
import type {ILabel} from '@/modelTypes/ILabel'
import {useAuthStore} from '@/stores/auth'
import {useLabelStore} from '@/stores/labels'

import { useTitle } from '@/composables/useTitle'
import {useLabelStyles} from '@/composables/useLabelStyles'

const {t} = useI18n({useScope: 'global'})

// ── Existing single-label state ───────────────────────────────────────────────
const labelEditLabel = ref<ILabel>(new LabelModel())
const isLabelEdit = ref(false)
const editorActive = ref(false)
const showDeleteModal = ref(false)
const labelToDelete = ref<ILabel | undefined>(undefined)

useTitle(() => t('label.title'))

const authStore = useAuthStore()
const userInfo = computed(() => authStore.info)

const labelStore = useLabelStore()
labelStore.loadAllLabels()

const loading = computed(() => labelStore.isLoading)
const {getLabelStyles} = useLabelStyles()

// ── Bulk-selection state ──────────────────────────────────────────────────────

/** IDs of currently selected labels. Replaced (not mutated) to keep reactivity. */
const selectedIds = ref(new Set<number>())

/** ref to the Select-all <input> — used to set .indeterminate directly on the DOM element. */
const selectAllRef = ref<HTMLInputElement | null>(null)

/** ref to the native <dialog> used for bulk-delete confirmation. */
const bulkConfirmRef = ref<HTMLDialogElement | null>(null)

const allSelected = computed(
	() => labelStore.labelsArray.length > 0 && selectedIds.value.size === labelStore.labelsArray.length,
)
const someButNotAll = computed(
	() => selectedIds.value.size > 0 && !allSelected.value,
)

// Set the real DOM .indeterminate property on the Select-all checkbox whenever
// the selection state changes.  This cannot be done with v-bind because
// indeterminate is a DOM property, not an HTML attribute.
watchEffect(() => {
	const el = selectAllRef.value
	if (el) {
		el.indeterminate = someButNotAll.value
	}
}, {flush: 'post'})

function toggleLabel(id: number) {
	const next = new Set(selectedIds.value)
	if (next.has(id)) {
		next.delete(id)
	} else {
		next.add(id)
	}
	selectedIds.value = next
}

function toggleSelectAll() {
	if (allSelected.value) {
		selectedIds.value = new Set()
	} else {
		selectedIds.value = new Set(labelStore.labelsArray.map(l => l.id))
	}
}

function openBulkConfirm() {
	bulkConfirmRef.value?.showModal()
}

function cancelBulkDelete() {
	bulkConfirmRef.value?.close()
	// Selection is intentionally left intact (requirement f).
}

async function confirmBulkDelete() {
	bulkConfirmRef.value?.close()
	const toDelete = [...selectedIds.value]
	// Clear selection first so the bulk bar disappears immediately (requirement g).
	selectedIds.value = new Set()
	await Promise.all(
		toDelete.map(id => {
			const label = labelStore.getLabelById(id)
			return label ? labelStore.deleteLabel(label) : Promise.resolve()
		}),
	)
}

// ── Existing single-label functions (unchanged) ───────────────────────────────

function deleteLabel(label?: ILabel) {
	if (!label) {
		return
	}

	showDeleteModal.value = false
	isLabelEdit.value = false
	return labelStore.deleteLabel(label)
}

function editLabelSubmit() {
	return labelStore.updateLabel(labelEditLabel.value)
}

function editLabel(label: ILabel) {
	if (label.createdBy.id !== userInfo.value.id) {
		return
	}
	// Duplicating the label to make sure it does not look like changes take effect immediatly as the label
	// object passed to this function here still has a reference to the store.
	labelEditLabel.value = new LabelModel({
		...label,
		// The model does not support passing dates into it directly so we need to convert them first
		created: +label.created,
		updated: +label.updated,
	})
	isLabelEdit.value = true

	// This makes the editor trigger its mounted function again which makes it forget every input
	// it currently has in its textarea. This is a counter-hack to a hack inside of vue-easymde
	// which made it impossible to detect change from the outside. Therefore the component would
	// not update if new content from the outside was made available.
	// See https://github.com/NikulinIlya/vue-easymde/issues/3
	editorActive.value = false
	nextTick(() => editorActive.value = true)
}

function showDeleteDialoge(label: ILabel) {
	labelToDelete.value = label
	showDeleteModal.value = true
}
</script>

<style lang="scss" scoped>
.label-edit-button {
	border-radius: 100%;
	background-color: rgba(0,0,0,0.2);
	inline-size: 1rem;
	block-size: 1rem;
	display: flex;
  	align-items: center;
  	justify-content: center;
	color: #ffffff; // always white
	margin-inline-start: .25rem;

	.icon {
		block-size: .5rem;
	}
}

// ── Bulk-selection layout ─────────────────────────────────────────────────────

.label-select-all-row,
.label-chip-row {
	display: flex;
	align-items: center;
	gap: .5rem;
	margin-block-end: .375rem;
}

.label-bulk-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: .5rem 1rem;
	margin-block-end: 1rem;
	background: var(--grey-100, #f1f5f9);
	border-radius: .375rem;
}

.label-bulk-count {
	font-weight: 600;
}

// ── Bulk-confirm dialog ───────────────────────────────────────────────────────

.label-bulk-confirm {
	// reset UA dialog styles
	border: none;
	border-radius: .5rem;
	padding: 1.5rem 2rem;
	min-inline-size: 18rem;
	background: var(--site-background, #fff);
	color: var(--text, #1e293b);
	box-shadow: 0 4px 24px rgba(0, 0, 0, .2);

	&::backdrop {
		background: rgba(0, 0, 0, .6);
	}
}

.label-bulk-confirm-text {
	font-size: 1rem;
	margin-block-end: 1.25rem;
	text-align: center;
}

.label-bulk-confirm-actions {
	display: flex;
	justify-content: center;
	gap: .75rem;
}
</style>
