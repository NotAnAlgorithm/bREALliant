import { expect, test } from '@playwright/test'

import { dismissPrerequisiteGate, signUp, uniqueUser } from './helpers'

// Resume relies on debounced progress writes round-tripping through Supabase,
// so allow a couple of retries to absorb timing jitter.
test.describe(() => {
  test.describe.configure({ retries: 2 })

  test('lesson progress is rehydrated after a reload', async ({ page }) => {
    const user = uniqueUser()
    await signUp(page, user)

    await page.goto('/lesson/lesson-bounds-01')
    await dismissPrerequisiteGate(page)

    await expect(page.getByText('Step 1 of', { exact: false })).toBeVisible()

    // Advance one step and wait for the progress upsert (step_index 1) to land
    // before reloading, so the reload reads persisted state.
    const saved = page.waitForResponse(
      (res) =>
        res.url().includes('/rest/v1/lesson_progress') &&
        res.request().method() === 'POST' &&
        (res.request().postData() ?? '').includes('"step_index":1'),
    )
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByText('Step 2 of', { exact: false })).toBeVisible()
    await saved

    await page.reload()
    await dismissPrerequisiteGate(page)

    // Rehydrated back onto the same step rather than restarting at step 1.
    await expect(page.getByText('Step 2 of', { exact: false })).toBeVisible()
  })
})
