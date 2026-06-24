import type { Lesson, Unit } from '@content/schemas'

export type LessonStatus = 'completed' | 'in_progress' | 'unlocked' | 'locked'

export type CourseProgress = {
  completedIds: ReadonlySet<string>
  inProgressIds: ReadonlySet<string>
}

type LessonLike = Pick<Lesson, 'lessonId' | 'prerequisites'>

/** A lesson is unlocked once every prerequisite has been completed. */
export function isLessonUnlocked(
  lesson: Pick<Lesson, 'prerequisites'>,
  completedIds: ReadonlySet<string>,
): boolean {
  return lesson.prerequisites.every((id) => completedIds.has(id))
}

/** Prerequisite lesson ids the learner has not completed yet. */
export function missingPrerequisites(
  lesson: Pick<Lesson, 'prerequisites'>,
  completedIds: ReadonlySet<string>,
): string[] {
  return lesson.prerequisites.filter((id) => !completedIds.has(id))
}

export function computeLessonStatus(
  lesson: LessonLike,
  progress: CourseProgress,
): LessonStatus {
  if (progress.completedIds.has(lesson.lessonId)) return 'completed'
  if (!isLessonUnlocked(lesson, progress.completedIds)) return 'locked'
  if (progress.inProgressIds.has(lesson.lessonId)) return 'in_progress'
  return 'unlocked'
}

export function computeCourseStatuses(
  lessons: ReadonlyArray<LessonLike>,
  progress: CourseProgress,
): Map<string, LessonStatus> {
  return new Map(
    lessons.map((lesson) => [
      lesson.lessonId,
      computeLessonStatus(lesson, progress),
    ]),
  )
}

/**
 * Lessons that become newly available because `justCompletedId` was completed.
 * `completedIds` must already include `justCompletedId`.
 */
export function lessonsUnlockedBy(
  justCompletedId: string,
  lessons: ReadonlyArray<LessonLike>,
  completedIds: ReadonlySet<string>,
): string[] {
  return lessons
    .filter((lesson) => lesson.prerequisites.includes(justCompletedId))
    .filter((lesson) => !completedIds.has(lesson.lessonId))
    .filter((lesson) => isLessonUnlocked(lesson, completedIds))
    .map((lesson) => lesson.lessonId)
}

/** First not-yet-completed, unlocked lesson in course order, if any. */
export function pickNextLesson(
  orderedLessonIds: ReadonlyArray<string>,
  lessonsById: ReadonlyMap<string, Pick<Lesson, 'prerequisites'>>,
  completedIds: ReadonlySet<string>,
  excludeId?: string,
): string | null {
  for (const id of orderedLessonIds) {
    if (id === excludeId || completedIds.has(id)) continue
    const lesson = lessonsById.get(id)
    if (lesson && isLessonUnlocked(lesson, completedIds)) return id
  }
  return null
}

export function isUnitComplete(
  unit: Pick<Unit, 'lessonIds'>,
  completedIds: ReadonlySet<string>,
): boolean {
  return (
    unit.lessonIds.length > 0 &&
    unit.lessonIds.every((id) => completedIds.has(id))
  )
}

type CourseLike = { units: ReadonlyArray<Pick<Unit, 'lessonIds'>> }

export function isCourseComplete(
  course: CourseLike,
  completedIds: ReadonlySet<string>,
): boolean {
  return (
    course.units.length > 0 &&
    course.units.every((unit) => isUnitComplete(unit, completedIds))
  )
}

export function flattenLessonIds(course: CourseLike): string[] {
  return course.units.flatMap((unit) => unit.lessonIds)
}
