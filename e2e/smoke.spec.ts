import { expect, test } from '@playwright/test'

test('home page renders the course path for a logged-out visitor', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Learn by doing' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})
