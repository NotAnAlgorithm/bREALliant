import courseFixture from '@content/fixtures/course.json'
import lessonBoundsFixture from '@content/fixtures/lesson-bounds-01.json'
import lessonLubFixture from '@content/fixtures/lesson-lub-01.json'

import {
  parseCourse,
  validateCourse,
  validateLesson,
  type Course,
  type Lesson,
} from '@content/schemas'

const LESSON_FIXTURES: Record<string, unknown> = {
  'lesson-bounds-01': lessonBoundsFixture,
  'lesson-lub-01': lessonLubFixture,
}

export function loadCourse(): Course {
  return parseCourse(courseFixture)
}

export function loadLesson(lessonId: string): Lesson {
  const lesson = tryLoadLesson(lessonId)
  if (!lesson) {
    throw new Error(`Unknown lesson: ${lessonId}`)
  }
  return lesson
}

export function tryLoadLesson(lessonId: string): Lesson | null {
  const raw = LESSON_FIXTURES[lessonId]
  if (!raw) return null
  const result = validateLesson(raw)
  return result.success ? result.data : null
}

export function loadAllLessons(): Lesson[] {
  return Object.keys(LESSON_FIXTURES).map((id) => loadLesson(id))
}

export function getAvailableLessonIds(): string[] {
  return Object.keys(LESSON_FIXTURES)
}

export { validateCourse, validateLesson }
