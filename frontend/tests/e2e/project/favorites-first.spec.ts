import {type Page} from '@playwright/test'
import {test, expect} from '../../support/fixtures'
import {createProjects} from './prepareProjects'

const CARD_TITLE = '.project-grid-item .project-title'

function favoritesFirstToggle(page: Page) {
	return page.locator('[data-cy="favorites-first-check"]')
}

async function favoriteProject(page: Page, title: string) {
	const card = page.locator('.project-grid-item').filter({hasText: title})
	await card.hover()
	const favoriteRequest = page.waitForResponse(response =>
		response.url().includes('/projects/') && response.request().method() === 'POST',
	)
	await card.locator('.favorite').click()
	await favoriteRequest
	await expect(card.locator('.favorite.is-favorite')).toBeVisible()
}

test.describe('Projects overview favorites first', () => {
	test('sorts favorites first while keeping the order within each group', async ({authenticatedPage: page}) => {
		await createProjects(4)

		await page.goto('/projects')
		await expect(page.locator(CARD_TITLE)).toHaveCount(4)

		const originalOrder = await page.locator(CARD_TITLE).allInnerTexts()
		const favorites = [originalOrder[1], originalOrder[3]]
		const nonFavorites = [originalOrder[0], originalOrder[2]]

		for (const title of favorites) {
			await favoriteProject(page, title)
		}

		await expect(page.locator(CARD_TITLE)).toHaveText(originalOrder)

		await favoritesFirstToggle(page).click()
		await expect(page.locator(CARD_TITLE)).toHaveText([...favorites, ...nonFavorites])

		// The toggle is stored in localStorage, so it has to survive a reload
		await page.reload()
		await expect(favoritesFirstToggle(page).locator('input')).toBeChecked()
		await expect(page.locator(CARD_TITLE)).toHaveText([...favorites, ...nonFavorites])

		await favoritesFirstToggle(page).click()
		await expect(page.locator(CARD_TITLE)).toHaveText(originalOrder)
	})
})
