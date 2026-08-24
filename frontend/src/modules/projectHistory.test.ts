import {test, expect, vi} from 'vitest'
import {getHistory, pruneHistory, removeProjectFromHistory, saveProjectToHistory} from './projectHistory'

test('return an empty history when none was saved', () => {
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => null)
	const h = getHistory()
	expect(h).toStrictEqual([])
})

test('return a saved history', () => {
	const saved = [{id: 1}, {id: 2}]
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => JSON.stringify(saved))

	const h = getHistory()
	expect(h).toStrictEqual(saved)
})

test('store project in history', () => {
	let saved = {}
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => null)
	vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, projects: string) => {
		saved = projects
	})

	saveProjectToHistory({id: 1})
	expect(saved).toBe('[{"id":1}]')
})

test('store only the last 6 projects in history', () => {
	let saved: string | null = null
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, projects: string) => {
		saved = projects
	})

	saveProjectToHistory({id: 1})
	saveProjectToHistory({id: 2})
	saveProjectToHistory({id: 3})
	saveProjectToHistory({id: 4})
	saveProjectToHistory({id: 5})
	saveProjectToHistory({id: 6})
	saveProjectToHistory({id: 7})
	expect(saved).toBe('[{"id":7},{"id":6},{"id":5},{"id":4},{"id":3},{"id":2}]')
})

test('don\'t store the same project twice', () => {
	let saved: string | null = null
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, projects: string) => {
		saved = projects
	})

	saveProjectToHistory({id: 1})
	saveProjectToHistory({id: 1})
	expect(saved).toBe('[{"id":1}]')
})

test('move a project to the beginning when storing it multiple times', () => {
	let saved: string | null = null
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, projects: string) => {
		saved = projects
	})

	saveProjectToHistory({id: 1})
	saveProjectToHistory({id: 2})
	saveProjectToHistory({id: 1})
	expect(saved).toBe('[{"id":1},{"id":2}]')
})

test('remove project from history', () => {
	let saved: string | null = '[{"id": 1}]'
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, projects: string) => {
		saved = projects
	})
	vi.spyOn(localStorage, 'removeItem').mockImplementation((key: string) => {
		saved = null
	})

	removeProjectFromHistory({id: 1})
	expect(saved).toBeNull()
})

test('prune removes entries whose id is absent from existing ids', () => {
	let saved: string | null = JSON.stringify([{id: 1}, {id: 2}, {id: 3}])
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((_key: string, projects: string) => {
		saved = projects
	})

	pruneHistory([1, 3])
	expect(JSON.parse(saved!)).toStrictEqual([{id: 1}, {id: 3}])
})

test('prune keeps a negative saved-filter id that is present in existing ids', () => {
	let saved: string | null = JSON.stringify([{id: 1}, {id: 2}, {id: -5}])
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => saved)
	vi.spyOn(localStorage, 'setItem').mockImplementation((_key: string, projects: string) => {
		saved = projects
	})

	pruneHistory([1, -5])
	expect(JSON.parse(saved!)).toStrictEqual([{id: 1}, {id: -5}])
})

test('prune does not write to localStorage when nothing was removed', () => {
	let writeCount = 0
	vi.spyOn(localStorage, 'getItem').mockImplementation(() => JSON.stringify([{id: 1}, {id: 2}]))
	vi.spyOn(localStorage, 'setItem').mockImplementation(() => { writeCount++ })

	pruneHistory([1, 2, 3])
	expect(writeCount).toBe(0)
})
