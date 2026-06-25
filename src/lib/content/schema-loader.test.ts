import { describe, expect, it } from 'vitest'

import {
  loadAllLessons,
  loadCourse,
  loadLesson,
  validateLesson,
} from './schema-loader'

describe('schema-loader', () => {
  it('loads and validates the course fixture', () => {
    const course = loadCourse()
    expect(course.courseId).toBe('rudin-real-analysis')
    expect(course.units[0]?.lessonIds).toContain('lesson-lub-01')
  })

  it('loads a lesson by id', () => {
    const lesson = loadLesson('lesson-lub-01')
    expect(lesson.prerequisites).toEqual(['lesson-bounds-01'])
    expect(lesson.steps).toHaveLength(9)
  })

  it('loads all registered lesson fixtures', () => {
    const lessons = loadAllLessons()
    expect(lessons.map((lesson) => lesson.lessonId)).toContain(
      'lesson-archimedean-01',
    )
  })

  it('rejects invalid lesson json', () => {
    const result = validateLesson({ lessonId: 'bad', title: 'x', steps: [] })
    expect(result.success).toBe(false)
  })

  it('rejects duplicate step ids', () => {
    const result = validateLesson({
      lessonId: 'dup',
      title: 'Duplicate steps',
      steps: [
        { id: 's1', type: 'motivation', blocks: [] },
        { id: 's1', type: 'summary', blocks: [] },
      ],
    })
    expect(result.success).toBe(false)
  })
})
