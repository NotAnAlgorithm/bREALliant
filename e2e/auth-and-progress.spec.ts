import { expect, test } from '@playwright/test'

import {
  completeLesson,
  openLessonFromCoursePath,
  signUp,
  uniqueUser,
} from './helpers'

test('a new user can sign up, finish a lesson, and unlock the next one', async ({
  page,
}) => {
  const user = uniqueUser()

  await signUp(page, user)

  // Open "Bounds and Suprema". Depending on content prerequisites it may be
  // Ready or Locked; the helper confirms the "skip prerequisites" dialog when
  // it appears, so either way we land inside the lesson.
  await openLessonFromCoursePath(page, 'Bounds and Suprema')

  // Step through the lesson; the single problem step accepts "1" as correct.
  await completeLesson(page, '1')

  // A completion screen appears (Lesson/Unit/Course complete!).
  await expect(
    page.getByRole('heading', { name: /complete!/ }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Back to course path' }).click()
  await expect(page).toHaveURL('/')

  // The finished lesson is now Completed and the dependent lesson is Ready.
  await expect(
    page.getByRole('button', { name: 'Bounds and Suprema — Completed' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'The Least Upper Bound Property — Ready',
    }),
  ).toBeVisible()
})
