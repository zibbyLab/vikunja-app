import {describe, it, expect, beforeEach} from 'vitest'
import {setActivePinia, createPinia} from 'pinia'
import {useSavedViewsStore} from './savedViews'

describe('savedViews store', () => {
	beforeEach(() => {
		localStorage.clear()
		setActivePinia(createPinia())
	})

	it('should add a saved view and return it with an id', () => {
		const store = useSavedViewsStore()
		const view = store.addSavedView(1, 'My Filter', {filter: 'done = false', s: 'bug'})

		expect(view.id).toBeTruthy()
		expect(view.name).toBe('My Filter')
		expect(view.filterParams).toEqual({filter: 'done = false', s: 'bug'})
	})

	it('should list saved views for a project', () => {
		const store = useSavedViewsStore()
		store.addSavedView(1, 'View A', {s: 'alpha'})
		store.addSavedView(1, 'View B', {s: 'beta'})

		expect(store.getSavedViews(1)).toHaveLength(2)
	})

	it('should return empty array for a project with no views', () => {
		const store = useSavedViewsStore()
		expect(store.getSavedViews(99)).toEqual([])
	})

	it('should retrieve a single saved view by id', () => {
		const store = useSavedViewsStore()
		const added = store.addSavedView(1, 'My View', {sort_by: ['id'], order_by: ['asc']})

		const found = store.getSavedView(1, added.id)
		expect(found).toEqual(added)
	})

	it('should return undefined for a non-existent view id', () => {
		const store = useSavedViewsStore()
		expect(store.getSavedView(1, 'no-such-id')).toBeUndefined()
	})

	it('should rename a saved view', () => {
		const store = useSavedViewsStore()
		const view = store.addSavedView(1, 'Old Name', {})
		store.updateSavedView(1, view.id, 'New Name')

		expect(store.getSavedView(1, view.id)?.name).toBe('New Name')
	})

	it('should delete a saved view', () => {
		const store = useSavedViewsStore()
		const view = store.addSavedView(1, 'To Delete', {})
		store.deleteSavedView(1, view.id)

		expect(store.getSavedViews(1)).toHaveLength(0)
	})

	it('should track and retrieve the last applied view id', () => {
		const store = useSavedViewsStore()
		const view = store.addSavedView(1, 'Active View', {})
		store.setLastAppliedViewId(1, view.id)

		expect(store.getLastAppliedViewId(1)).toBe(view.id)
	})

	it('should return undefined for last applied view if never set', () => {
		const store = useSavedViewsStore()
		expect(store.getLastAppliedViewId(1)).toBeUndefined()
	})

	it('should persist to localStorage and restore on reload', () => {
		const store = useSavedViewsStore()
		store.addSavedView(1, 'Persistent View', {filter: 'done = false'})
		store.setLastAppliedViewId(1, store.getSavedViews(1)[0].id)

		// simulate page reload: new Pinia reads from the same localStorage
		setActivePinia(createPinia())
		const reloaded = useSavedViewsStore()

		expect(reloaded.getSavedViews(1)).toHaveLength(1)
		expect(reloaded.getSavedViews(1)[0].name).toBe('Persistent View')
		expect(reloaded.getLastAppliedViewId(1)).toBe(store.getSavedViews(1)[0].id)
	})
})
