import { all, create } from 'mathjs'
import { describe, expect, it } from 'vitest'

import type { Feedback } from '@content/schemas/feedback'
import type { Lesson, QuizItem } from '@content/schemas'
import type { Validator } from '@content/schemas/validators'
import type { Widget, WidgetKind } from '@content/schemas/widgets'

import { runValidator } from '../validators/run-validator'
import { isWidgetImplemented } from '../../widgets/widget-registry'
import {
  getAvailableLessonIds,
  loadAllLessons,
  loadCourse,
  tryLoadLesson,
} from './schema-loader'

// Widgets whose answer is graded. Discovery widgets (number_line, fraction_line)
// may legitimately appear without a validator, so they are excluded here.
const GRADEABLE_KINDS: ReadonlySet<WidgetKind> = new Set<WidgetKind>([
  'fill_blank',
  'rational_input',
  'multiple_choice',
  'multiple_select',
  'drag_order',
  'spot_the_flaw',
  'justify_step',
])

type GradedItem = {
  label: string
  widget: Widget
  validator: Validator
  feedback: Feedback
}

/** Pull the `id` field out of an array-of-objects widget prop. */
function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) =>
    entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string'
      ? [(entry as { id: string }).id]
      : [],
  )
}

function quizItemsWithKind(lesson: Lesson): { item: QuizItem; where: string }[] {
  const out: { item: QuizItem; where: string }[] = []
  for (const step of lesson.steps) {
    if (step.type === 'quiz') {
      for (const item of step.items) {
        out.push({ item, where: `quiz ${step.id}/${item.id}` })
      }
    }
  }
  for (const item of lesson.retrievalBank ?? []) {
    out.push({ item, where: `retrievalBank/${item.id}` })
  }
  return out
}

function gradedItems(lesson: Lesson): GradedItem[] {
  const out: GradedItem[] = []
  for (const step of lesson.steps) {
    if (step.type === 'problem') {
      out.push({
        label: `problem ${step.id}`,
        widget: step.widget,
        validator: step.validator,
        feedback: step.feedback,
      })
    }
  }
  for (const { item, where } of quizItemsWithKind(lesson)) {
    if (item.validator && item.feedback) {
      out.push({
        label: where,
        widget: item.widget,
        validator: item.validator,
        feedback: item.feedback,
      })
    }
  }
  return out
}

/**
 * Re-encode a justify_step solution the same way the feedback engine reads it:
 * stepIds sorted lexicographically, each rendered "stepId:justId", comma-joined.
 */
function reencodeJustifyStep(map: Record<string, string>): string {
  return Object.keys(map)
    .sort()
    .map((stepId) => `${stepId}:${map[stepId]}`)
    .join(',')
}

const math = create(all, {})

/** Evaluate a bound the same way the validator does ("1/3" → 0.333…). */
function evalBound(expr: string): number {
  const value = math.evaluate(expr)
  return typeof value === 'number' ? value : Number.NaN
}

const lessons = loadAllLessons()

describe('course wiring', () => {
  const course = loadCourse()
  const courseLessonIds = course.units.flatMap((u) => u.lessonIds)

  it('every lesson referenced by the course loads', () => {
    for (const id of courseLessonIds) {
      expect(tryLoadLesson(id), `course references missing lesson ${id}`).not.toBeNull()
    }
  })

  it('every registered lesson is placed in exactly one unit', () => {
    const registered = [...getAvailableLessonIds()].sort()
    const inCourse = [...courseLessonIds].sort()
    expect(inCourse).toEqual(registered)
    // no duplicate placements
    expect(new Set(courseLessonIds).size).toBe(courseLessonIds.length)
  })

  it('every prerequisite refers to a loadable lesson', () => {
    for (const lesson of lessons) {
      for (const prereq of lesson.prerequisites) {
        expect(
          tryLoadLesson(prereq),
          `${lesson.lessonId} has missing prerequisite ${prereq}`,
        ).not.toBeNull()
      }
    }
  })
})

describe('lesson content integrity', () => {
  for (const lesson of lessons) {
    describe(lesson.lessonId, () => {
      it('every gradeable quiz/retrieval item has a validator and feedback', () => {
        for (const { item, where } of quizItemsWithKind(lesson)) {
          if (GRADEABLE_KINDS.has(item.widget.kind)) {
            expect(item.validator, `${where}: missing validator`).toBeDefined()
            expect(item.feedback, `${where}: missing feedback`).toBeDefined()
          }
        }
      })

      for (const graded of gradedItems(lesson)) {
        describe(graded.label, () => {
          const { widget, validator, feedback } = graded

          it('uses an implemented widget', () => {
            expect(
              isWidgetImplemented(widget.kind),
              `unimplemented widget kind: ${widget.kind}`,
            ).toBe(true)
          })

          it('has a non-empty accept list', () => {
            expect(validator.accept.length).toBeGreaterThan(0)
          })

          it('keeps the catch-all (*) as the last feedback entry', () => {
            const starIndex = feedback.incorrect.findIndex((f) => f.match === '*')
            expect(starIndex, 'no catch-all "*" feedback').toBeGreaterThanOrEqual(0)
            expect(starIndex).toBe(feedback.incorrect.length - 1)
          })

          it('canonical answer satisfies its own validator', () => {
            if (validator.type === 'interval') {
              // accept = [lower, upper]; the midpoint must lie strictly inside.
              expect(validator.accept.length).toBeGreaterThanOrEqual(2)
              const lo = evalBound(validator.accept[0])
              const hi = evalBound(validator.accept[1])
              expect(Number.isFinite(lo) && Number.isFinite(hi)).toBe(true)
              const mid = String((lo + hi) / 2)
              expect(runValidator(validator, mid)).toBe(true)
              return
            }
            for (const accepted of validator.accept) {
              expect(
                runValidator(validator, accepted),
                `accepted answer "${accepted}" does not validate`,
              ).toBe(true)
            }
          })

          it('accept values are consistent with the widget', () => {
            switch (widget.kind) {
              case 'multiple_choice': {
                const ids = new Set(idList(widget.props.choices))
                expect(ids.size).toBeGreaterThan(1)
                for (const accepted of validator.accept) {
                  expect(ids.has(accepted), `choice "${accepted}" not offered`).toBe(true)
                }
                break
              }
              case 'spot_the_flaw': {
                const ids = new Set(idList(widget.props.steps))
                expect(ids.size).toBeGreaterThan(1)
                for (const accepted of validator.accept) {
                  expect(ids.has(accepted), `step "${accepted}" not present`).toBe(true)
                }
                break
              }
              case 'multiple_select': {
                const ids = new Set(idList(widget.props.choices))
                expect(ids.size).toBeGreaterThan(1)
                for (const accepted of validator.accept) {
                  const selected = accepted.split(',')
                  // Non-empty subset of the offered choice ids.
                  expect(selected.length).toBeGreaterThanOrEqual(1)
                  for (const id of selected) {
                    expect(ids.has(id), `choice "${id}" not offered`).toBe(true)
                  }
                  // Must already be in the canonical (sorted) encoding the
                  // feedback engine produces.
                  expect([...selected].sort().join(',')).toBe(accepted)
                }
                break
              }
              case 'drag_order': {
                const itemIds = idList(widget.props.items)
                expect(itemIds.length).toBeGreaterThan(1)
                for (const accepted of validator.accept) {
                  const order = accepted.split(',')
                  expect([...order].sort()).toEqual([...itemIds].sort())
                  expect(order.length).toBe(itemIds.length)
                }
                break
              }
              case 'justify_step': {
                const stepIds = idList(widget.props.steps)
                const justIds = new Set(idList(widget.props.justifications))
                for (const accepted of validator.accept) {
                  const map: Record<string, string> = {}
                  for (const pair of accepted.split(',')) {
                    const [stepId, justId] = pair.split(':')
                    expect(stepId && justId, `malformed pair "${pair}"`).toBeTruthy()
                    expect(justIds.has(justId), `justification "${justId}" not offered`).toBe(true)
                    map[stepId] = justId
                  }
                  // Every step must be matched, and the string must already be in
                  // the canonical (sorted) encoding the feedback engine produces.
                  expect([...Object.keys(map)].sort()).toEqual([...stepIds].sort())
                  expect(reencodeJustifyStep(map)).toBe(accepted)
                }
                break
              }
              default:
                // fill_blank / rational_input / number_line / fraction_line are
                // covered by the canonical-answer validation above.
                break
            }
          })
        })
      }
    })
  }
})
