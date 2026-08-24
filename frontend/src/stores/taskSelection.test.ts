import {setActivePinia, createPinia} from 'pinia'
import {describe, it, expect, beforeEach} from 'vitest'

import {useTaskSelectionStore} from './taskSelection'

describe('taskSelection store', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('select adds an id to the selection', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		expect(store.isSelected(1)).toBe(true)
	})

	it('selecting an already-selected id does not duplicate it', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		store.select(1)
		expect(store.selectedCount).toBe(1)
	})

	it('deselect removes an id from the selection', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		store.deselect(1)
		expect(store.isSelected(1)).toBe(false)
	})

	it('toggle selects an unselected id', () => {
		const store = useTaskSelectionStore()
		store.toggle(1)
		expect(store.isSelected(1)).toBe(true)
	})

	it('toggle deselects a selected id', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		store.toggle(1)
		expect(store.isSelected(1)).toBe(false)
	})

	it('clear removes all selected ids', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		store.select(2)
		store.clear()
		expect(store.selectedCount).toBe(0)
		expect(store.hasSelection).toBe(false)
	})

	it('selectedCount returns the number of selected ids', () => {
		const store = useTaskSelectionStore()
		store.select(1)
		store.select(2)
		store.select(3)
		expect(store.selectedCount).toBe(3)
	})

	describe('setCurrentList', () => {
		it('clears the selection when the projectId changes', () => {
			const store = useTaskSelectionStore()
			store.setCurrentList(1, 10)
			store.select(42)
			store.setCurrentList(2, 10)
			expect(store.selectedCount).toBe(0)
		})

		it('clears the selection when the viewId changes', () => {
			const store = useTaskSelectionStore()
			store.setCurrentList(1, 10)
			store.select(42)
			store.setCurrentList(1, 20)
			expect(store.selectedCount).toBe(0)
		})

		it('preserves the selection when called again with the same pair', () => {
			const store = useTaskSelectionStore()
			store.setCurrentList(1, 10)
			store.select(42)
			store.setCurrentList(1, 10)
			expect(store.selectedCount).toBe(1)
			expect(store.isSelected(42)).toBe(true)
		})
	})
})
