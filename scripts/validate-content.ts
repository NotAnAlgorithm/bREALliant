import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  courseSchema,
  lessonSchema,
  type Course,
  type Lesson,
} from '../content/schemas/index.ts'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const FIXTURES_DIR = join(ROOT, 'content', 'fixtures')

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function loadFixtures(): { course: Course; lessons: Map<string, Lesson> } {
  const coursePath = join(FIXTURES_DIR, 'course.json')
  const courseResult = courseSchema.safeParse(readJson(coursePath))
  if (!courseResult.success) {
    console.error('Invalid course.json:')
    console.error(courseResult.error.format())
    process.exit(1)
  }

  const lessons = new Map<string, Lesson>()
  const files = readdirSync(FIXTURES_DIR).filter(
    (f) => f.startsWith('lesson-') && f.endsWith('.json'),
  )

  for (const file of files) {
    const raw = readJson(join(FIXTURES_DIR, file))
    const result = lessonSchema.safeParse(raw)
    if (!result.success) {
      console.error(`Invalid ${file}:`)
      console.error(result.error.format())
      process.exit(1)
    }
    lessons.set(result.data.lessonId, result.data)
  }

  return { course: courseResult.data, lessons }
}

function validateReferences(course: Course, lessons: Map<string, Lesson>) {
  const lessonIds = new Set(lessons.keys())
  const errors: string[] = []

  for (const unit of course.units) {
    for (const id of unit.lessonIds) {
      if (!lessonIds.has(id)) {
        errors.push(`Unit "${unit.unitId}" references missing lesson "${id}"`)
      }
    }
  }

  for (const lesson of lessons.values()) {
    for (const prereq of lesson.prerequisites) {
      if (!lessonIds.has(prereq)) {
        errors.push(
          `Lesson "${lesson.lessonId}" has missing prerequisite "${prereq}"`,
        )
      }
    }
  }

  if (errors.length > 0) {
    console.error('Content reference errors:')
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
}

const { course, lessons } = loadFixtures()
validateReferences(course, lessons)

console.log(
  `Validated course "${course.courseId}" and ${lessons.size} lesson(s).`,
)
