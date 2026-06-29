import courseFixture from '@content/fixtures/course.json'
import lessonRationalsFixture from '@content/fixtures/lesson-rationals-01.json'
import lessonOrderedFieldsFixture from '@content/fixtures/lesson-ordered-fields-01.json'
import lessonBoundsFixture from '@content/fixtures/lesson-bounds-01.json'
import lessonLubFixture from '@content/fixtures/lesson-lub-01.json'
import lessonNthRootsFixture from '@content/fixtures/lesson-nth-roots-01.json'
import lessonArchimedeanFixture from '@content/fixtures/lesson-archimedean-01.json'
import lessonEuclideanFixture from '@content/fixtures/lesson-euclidean-01.json'
import lessonMetricSpacesFixture from '@content/fixtures/lesson-metric-spaces-01.json'
import lessonBallsNbhdsFixture from '@content/fixtures/lesson-balls-nbhds-01.json'
import lessonOpenClosedFixture from '@content/fixtures/lesson-open-closed-01.json'
import lessonLimitPointsFixture from '@content/fixtures/lesson-limit-points-01.json'
import lessonConnectednessFixture from '@content/fixtures/lesson-connectedness-01.json'
import lessonSeqLimitsFixture from '@content/fixtures/lesson-seq-limits-01.json'
import lessonLimitLawsFixture from '@content/fixtures/lesson-limit-laws-01.json'
import lessonMonotoneFixture from '@content/fixtures/lesson-monotone-01.json'
import lessonSubsequencesFixture from '@content/fixtures/lesson-subsequences-01.json'
import lessonBolzanoWeierstrassFixture from '@content/fixtures/lesson-bolzano-weierstrass-01.json'
import lessonCauchyFixture from '@content/fixtures/lesson-cauchy-01.json'
import lessonCompactnessFixture from '@content/fixtures/lesson-compactness-01.json'
import lessonSeriesBasicsFixture from '@content/fixtures/lesson-series-basics-01.json'
import lessonSeriesTestsFixture from '@content/fixtures/lesson-series-tests-01.json'
import lessonAbsConvFixture from '@content/fixtures/lesson-abs-conv-01.json'
import lessonFunctionLimitsFixture from '@content/fixtures/lesson-function-limits-01.json'
import lessonContinuityFixture from '@content/fixtures/lesson-continuity-01.json'
import lessonUniformContinuityFixture from '@content/fixtures/lesson-uniform-continuity-01.json'
import lessonEvtFixture from '@content/fixtures/lesson-evt-01.json'
import lessonIvtFixture from '@content/fixtures/lesson-ivt-01.json'
import lessonDerivativeFixture from '@content/fixtures/lesson-derivative-01.json'
import lessonMvtFixture from '@content/fixtures/lesson-mvt-01.json'
import lessonTaylorFixture from '@content/fixtures/lesson-taylor-01.json'
import lessonRiemannFixture from '@content/fixtures/lesson-riemann-01.json'
import lessonFtcFixture from '@content/fixtures/lesson-ftc-01.json'
import lessonPointwiseUniformFixture from '@content/fixtures/lesson-pointwise-uniform-01.json'
import lessonUniformPreserveFixture from '@content/fixtures/lesson-uniform-preserve-01.json'
import practiceBankFixture from '@content/fixtures/practice-bank.json'

import {
  parseCourse,
  parsePracticeBank,
  validateCourse,
  validateLesson,
  type Course,
  type Lesson,
  type PracticeBank,
} from '@content/schemas'

const LESSON_FIXTURES: Record<string, unknown> = {
  'lesson-rationals-01': lessonRationalsFixture,
  'lesson-ordered-fields-01': lessonOrderedFieldsFixture,
  'lesson-bounds-01': lessonBoundsFixture,
  'lesson-lub-01': lessonLubFixture,
  'lesson-nth-roots-01': lessonNthRootsFixture,
  'lesson-archimedean-01': lessonArchimedeanFixture,
  'lesson-euclidean-01': lessonEuclideanFixture,
  'lesson-metric-spaces-01': lessonMetricSpacesFixture,
  'lesson-balls-nbhds-01': lessonBallsNbhdsFixture,
  'lesson-open-closed-01': lessonOpenClosedFixture,
  'lesson-limit-points-01': lessonLimitPointsFixture,
  'lesson-connectedness-01': lessonConnectednessFixture,
  'lesson-seq-limits-01': lessonSeqLimitsFixture,
  'lesson-limit-laws-01': lessonLimitLawsFixture,
  'lesson-monotone-01': lessonMonotoneFixture,
  'lesson-subsequences-01': lessonSubsequencesFixture,
  'lesson-bolzano-weierstrass-01': lessonBolzanoWeierstrassFixture,
  'lesson-cauchy-01': lessonCauchyFixture,
  'lesson-compactness-01': lessonCompactnessFixture,
  'lesson-series-basics-01': lessonSeriesBasicsFixture,
  'lesson-series-tests-01': lessonSeriesTestsFixture,
  'lesson-abs-conv-01': lessonAbsConvFixture,
  'lesson-function-limits-01': lessonFunctionLimitsFixture,
  'lesson-continuity-01': lessonContinuityFixture,
  'lesson-uniform-continuity-01': lessonUniformContinuityFixture,
  'lesson-evt-01': lessonEvtFixture,
  'lesson-ivt-01': lessonIvtFixture,
  'lesson-derivative-01': lessonDerivativeFixture,
  'lesson-mvt-01': lessonMvtFixture,
  'lesson-taylor-01': lessonTaylorFixture,
  'lesson-riemann-01': lessonRiemannFixture,
  'lesson-ftc-01': lessonFtcFixture,
  'lesson-pointwise-uniform-01': lessonPointwiseUniformFixture,
  'lesson-uniform-preserve-01': lessonUniformPreserveFixture,
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

/**
 * The curated, concept-centric practice bank. Each item carries its own `tags`
 * (and optional `difficulty`); a single problem may belong to several concepts.
 * Merged into the retrieval bank alongside lesson items.
 */
export function loadPracticeBank(): PracticeBank {
  return parsePracticeBank(practiceBankFixture)
}

export { validateCourse, validateLesson }
