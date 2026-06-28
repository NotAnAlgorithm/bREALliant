import { describe, expect, it } from 'vitest'

import {
  computeCourseStatuses,
  computeLessonStatus,
  effectiveSatisfiedIds,
  flattenLessonIds,
  isCourseComplete,
  isLessonUnlocked,
  isUnitComplete,
  lessonsUnlockedBy,
  missingPrerequisites,
  pickNextLesson,
  retainedLessonIds,
  type CourseProgress,
} from './unlock'

const lessons = [
  { lessonId: 'a', prerequisites: [] as string[] },
  { lessonId: 'b', prerequisites: ['a'] },
  { lessonId: 'c', prerequisites: ['a', 'b'] },
]

function progress(
  completed: string[] = [],
  inProgress: string[] = [],
): CourseProgress {
  return {
    completedIds: new Set(completed),
    inProgressIds: new Set(inProgress),
  }
}

describe('isLessonUnlocked', () => {
  it('is unlocked with no prerequisites', () => {
    expect(isLessonUnlocked({ prerequisites: [] }, new Set())).toBe(true)
  })

  it('is locked while prerequisites are incomplete', () => {
    expect(isLessonUnlocked({ prerequisites: ['a'] }, new Set())).toBe(false)
  })

  it('unlocks once all prerequisites are complete', () => {
    expect(
      isLessonUnlocked({ prerequisites: ['a', 'b'] }, new Set(['a', 'b'])),
    ).toBe(true)
  })
})

describe('missingPrerequisites', () => {
  it('returns only the uncompleted prerequisites', () => {
    expect(
      missingPrerequisites({ prerequisites: ['a', 'b'] }, new Set(['a'])),
    ).toEqual(['b'])
  })
})

describe('computeLessonStatus', () => {
  it('reports completed first, even if also in progress', () => {
    expect(
      computeLessonStatus(lessons[1], progress(['a', 'b'], ['b'])),
    ).toBe('completed')
  })

  it('reports locked when prerequisites are missing', () => {
    expect(computeLessonStatus(lessons[1], progress())).toBe('locked')
  })

  it('reports in_progress for an unlocked, started lesson', () => {
    expect(computeLessonStatus(lessons[1], progress(['a'], ['b']))).toBe(
      'in_progress',
    )
  })

  it('reports unlocked for an available, untouched lesson', () => {
    expect(computeLessonStatus(lessons[1], progress(['a']))).toBe('unlocked')
  })
})

describe('computeCourseStatuses', () => {
  it('maps every lesson to a status', () => {
    const statuses = computeCourseStatuses(lessons, progress(['a']))
    expect(statuses.get('a')).toBe('completed')
    expect(statuses.get('b')).toBe('unlocked')
    expect(statuses.get('c')).toBe('locked')
  })
})

describe('lessonsUnlockedBy', () => {
  it('returns lessons whose remaining prerequisites are now satisfied', () => {
    // Completing 'a' unlocks 'b' but not 'c' (still needs 'b').
    expect(lessonsUnlockedBy('a', lessons, new Set(['a']))).toEqual(['b'])
  })

  it('returns c once both a and b are done', () => {
    expect(lessonsUnlockedBy('b', lessons, new Set(['a', 'b']))).toEqual(['c'])
  })

  it('excludes lessons that are already completed', () => {
    const onlyB = [{ lessonId: 'b', prerequisites: ['a'] }]
    expect(lessonsUnlockedBy('a', onlyB, new Set(['a', 'b']))).toEqual([])
  })
})

describe('pickNextLesson', () => {
  const ordered = ['a', 'b', 'c']
  const byId = new Map(lessons.map((l) => [l.lessonId, l]))

  it('picks the first unlocked, incomplete lesson in order', () => {
    expect(pickNextLesson(ordered, byId, new Set(['a']))).toBe('b')
  })

  it('skips the excluded lesson', () => {
    expect(pickNextLesson(ordered, byId, new Set(['a']), 'b')).toBe(null)
  })

  it('returns null when everything is completed', () => {
    expect(pickNextLesson(ordered, byId, new Set(['a', 'b', 'c']))).toBe(null)
  })
})

describe('mastery-based unlock (F1.4)', () => {
  const lessonsWithTags = [
    { lessonId: 'a', tags: ['t1', 't2'], prerequisites: [] },
    { lessonId: 'b', tags: ['t3'], prerequisites: ['a'] },
    { lessonId: 'no-tags', tags: [] as string[], prerequisites: [] },
  ]

  it('retainedLessonIds returns lessons whose every tag is retained', () => {
    const retained = retainedLessonIds(
      lessonsWithTags,
      new Set(['t1', 't2', 't3']),
    )
    expect(retained.has('a')).toBe(true)
    expect(retained.has('b')).toBe(true)
    // A lesson with no tags is never auto-satisfied by mastery.
    expect(retained.has('no-tags')).toBe(false)
  })

  it('retainedLessonIds excludes a lesson with a single un-retained tag', () => {
    const retained = retainedLessonIds(lessonsWithTags, new Set(['t1']))
    expect(retained.has('a')).toBe(false)
  })

  it('effectiveSatisfiedIds unions completion and retained mastery', () => {
    const satisfied = effectiveSatisfiedIds(new Set(['x']), new Set(['a']))
    expect([...satisfied].sort()).toEqual(['a', 'x'])
  })
})

describe('unit and course completion', () => {
  const course = {
    units: [
      { lessonIds: ['a', 'b'] },
      { lessonIds: ['c'] },
    ],
  }

  it('detects a completed unit', () => {
    expect(isUnitComplete(course.units[0], new Set(['a', 'b']))).toBe(true)
    expect(isUnitComplete(course.units[0], new Set(['a']))).toBe(false)
  })

  it('detects a completed course', () => {
    expect(isCourseComplete(course, new Set(['a', 'b', 'c']))).toBe(true)
    expect(isCourseComplete(course, new Set(['a', 'b']))).toBe(false)
  })

  it('flattens lesson ids in order', () => {
    expect(flattenLessonIds(course)).toEqual(['a', 'b', 'c'])
  })
})
