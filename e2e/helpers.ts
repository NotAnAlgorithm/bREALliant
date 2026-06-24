import { expect, type Page } from '@playwright/test'

export type TestUser = {
  username: string
  email: string
  password: string
}

/**
 * The local Supabase DB persists across runs, so every test needs a fresh
 * identity. Combine a timestamp with randomness to stay unique even when specs
 * run in parallel within the same millisecond.
 */
export function uniqueUser(prefix = 'tester'): TestUser {
  const id = `${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`
  const username = `${prefix}_${id}`
  return {
    username,
    email: `${username}@example.com`,
    password: 'BrealTest!2026',
  }
}

/**
 * Sign up a brand-new account via the UI. Email confirmation is disabled on the
 * local stack, so sign up creates a session immediately and redirects to '/'.
 */
export async function signUp(page: Page, user: TestUser): Promise<void> {
  await page.goto('/auth')

  // The page starts in sign-in mode; switch to sign-up via the footer button.
  await page.getByRole('button', { name: 'Sign up' }).click()

  await page.getByLabel('Username').fill(user.username)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)

  await page.getByRole('button', { name: 'Sign up' }).click()

  // Redirected home, signed in: the username links to the account page.
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: user.username })).toBeVisible()
}

/**
 * Open a lesson from the course path by its title. Locked lessons surface a
 * "Skip the prerequisites?" dialog first; ready lessons open directly. This
 * helper transparently confirms the dialog so it works in both cases.
 */
export async function openLessonFromCoursePath(
  page: Page,
  title: string,
): Promise<void> {
  await page.getByRole('button', { name: new RegExp(escapeRegExp(title)) }).click()

  const continueAnyway = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Continue anyway' })
  const lessonHeading = page.getByRole('heading', { name: title, level: 1 })

  await expect(continueAnyway.or(lessonHeading)).toBeVisible()
  if (await continueAnyway.isVisible()) {
    await continueAnyway.click()
  }

  await expect(lessonHeading).toBeVisible()
}

/**
 * Walk a lesson to its end. On problem steps it types `answer` into the answer
 * box and checks it (expecting a "Correct" status), then advances. Stops once
 * the final step's "Finish lesson" button appears, clicks it, and waits for the
 * completion screen.
 */
export async function completeLesson(page: Page, answer: string): Promise<void> {
  const finish = page.getByRole('button', { name: 'Finish lesson' })
  const checkAnswer = page.getByRole('button', { name: 'Check answer' })
  const continueBtn = page.getByRole('button', { name: 'Continue', exact: true })

  // Generous upper bound on the number of steps to avoid an infinite loop.
  for (let i = 0; i < 25; i += 1) {
    if (await finish.isVisible()) break

    if (await checkAnswer.isVisible()) {
      await page.getByRole('textbox', { name: 'Your answer' }).fill(answer)
      await checkAnswer.click()
      await expect(page.getByRole('status')).toContainText('Correct')
    }

    await continueBtn.click()
  }

  await expect(finish).toBeVisible()
  await finish.click()
}

/**
 * When a lesson is opened directly (e.g. via `page.goto` or a reload) without
 * the in-app "bypass" navigation state, an unmet-prerequisite lesson shows a
 * full-page gate with a "Continue anyway" button. Dismiss it if present so we
 * reach the lesson itself.
 */
export async function dismissPrerequisiteGate(page: Page): Promise<void> {
  const continueAnyway = page.getByRole('button', { name: 'Continue anyway' })
  // Progress loads asynchronously, so the gate can appear a beat after the
  // lesson route mounts. Wait for either the gate or the in-lesson step
  // indicator, then dismiss the gate only if that's what rendered.
  const stepIndicator = page.getByText(/Step \d+ of/)
  await expect(continueAnyway.or(stepIndicator)).toBeVisible()
  if (await continueAnyway.isVisible()) {
    await continueAnyway.click()
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
