import { z } from 'zod'

import { blockSchema } from './blocks'
import { feedbackSchema } from './feedback'
import { validatorSchema } from './validators'
import { widgetSchema } from './widgets'

const stepBaseSchema = z.object({
  id: z.string().min(1),
  // F3.1: optional concept tags for this step. When absent, the step inherits
  // its lesson's tags. Enables fine-grained interleaving and mastery credit.
  tags: z.array(z.string()).optional(),
})

export const motivationStepSchema = stepBaseSchema.extend({
  type: z.literal('motivation'),
  blocks: z.array(blockSchema),
  prompt: z.string().optional(),
})

export const discoverStepSchema = stepBaseSchema.extend({
  type: z.literal('discover'),
  prompt: z.string().optional(),
  widget: widgetSchema,
})

// F4: fading scaffold levels for a problem. 'worked' shows the worked solution
// up front, 'completion' offers it on demand, 'bare' withholds it. Selection
// fades as mastery grows (see src/lib/lesson/scaffold.ts).
export const scaffoldLevelSchema = z.enum(['worked', 'completion', 'bare'])

export const problemStepSchema = stepBaseSchema.extend({
  type: z.literal('problem'),
  prompt: z.string().optional(),
  widget: widgetSchema,
  validator: validatorSchema,
  feedback: feedbackSchema,
  // F4: optional worked solution shown (worked-example-first) and faded as the
  // learner gains mastery. `scaffold` is the authored default starting level.
  workedExample: z.array(blockSchema).optional(),
  scaffold: scaffoldLevelSchema.optional(),
})

export const summaryStepSchema = stepBaseSchema.extend({
  type: z.literal('summary'),
  blocks: z.array(blockSchema),
})

export const workedExampleStepSchema = stepBaseSchema.extend({
  type: z.literal('worked_example'),
  prompt: z.string().optional(),
  blocks: z.array(blockSchema),
})

export const quizItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string(),
  widget: widgetSchema,
  validator: validatorSchema.optional(),
  feedback: feedbackSchema.optional(),
  // F3.1: optional concept tags for this item (falls back to lesson tags).
  tags: z.array(z.string()).optional(),
  // Practice difficulty on a 1–3 scale (1 = standard … 3 = challenge). When
  // absent, difficulty-aware selection treats the item as 2 (standard). Used by
  // the curated practice bank and spaced review to ramp difficulty with mastery.
  difficulty: z.number().int().min(1).max(3).optional(),
})

export const quizStepSchema = stepBaseSchema.extend({
  type: z.literal('quiz'),
  items: z.array(quizItemSchema),
})

export const stepSchema = z.discriminatedUnion('type', [
  motivationStepSchema,
  discoverStepSchema,
  problemStepSchema,
  summaryStepSchema,
  workedExampleStepSchema,
  quizStepSchema,
])

export type Step = z.infer<typeof stepSchema>
export type MotivationStep = z.infer<typeof motivationStepSchema>
export type DiscoverStep = z.infer<typeof discoverStepSchema>
export type ProblemStep = z.infer<typeof problemStepSchema>
export type SummaryStep = z.infer<typeof summaryStepSchema>
export type WorkedExampleStep = z.infer<typeof workedExampleStepSchema>
export type QuizStep = z.infer<typeof quizStepSchema>
export type QuizItem = z.infer<typeof quizItemSchema>
export type ScaffoldLevel = z.infer<typeof scaffoldLevelSchema>

function assertUniqueStepIds(steps: Step[]): boolean {
  const ids = steps.map((s) => s.id)
  return ids.length === new Set(ids).size
}

export const lessonSchema = z
  .object({
    lessonId: z.string().min(1),
    title: z.string().min(1),
    tags: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    glossary: z
      .record(
        z.string(),
        z.object({ term: z.string().optional(), definition: z.string() }),
      )
      .default({}),
    steps: z.array(stepSchema).min(1),
    // F2: optional pool of graded items used for spaced review of this lesson's
    // concepts. When absent, the lesson's quiz items serve as the default bank.
    retrievalBank: z.array(quizItemSchema).optional(),
  })
  .refine((lesson) => assertUniqueStepIds(lesson.steps), {
    message: 'Lesson steps must have unique ids',
    path: ['steps'],
  })

export type Lesson = z.infer<typeof lessonSchema>
export type Glossary = Lesson['glossary']

export const unitSchema = z.object({
  unitId: z.string().min(1),
  title: z.string().min(1),
  lessonIds: z.array(z.string()).min(1),
})

export const courseSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  units: z.array(unitSchema).min(1),
})

export type Unit = z.infer<typeof unitSchema>
export type Course = z.infer<typeof courseSchema>

// The curated, concept-centric practice bank. A single flat list of graded
// items, each carrying its own `tags` so one (often multi-tag) problem is
// authored ONCE yet feeds every concept pool it belongs to. Merged into the
// retrieval bank alongside lesson-derived items (see buildRetrievalBank).
export const practiceBankSchema = z.object({
  items: z.array(quizItemSchema).default([]),
})

export type PracticeBank = z.infer<typeof practiceBankSchema>

export function validateLesson(data: unknown) {
  return lessonSchema.safeParse(data)
}

export function validateCourse(data: unknown) {
  return courseSchema.safeParse(data)
}

export function parseLesson(data: unknown): Lesson {
  return lessonSchema.parse(data)
}

export function parseCourse(data: unknown): Course {
  return courseSchema.parse(data)
}

export function validatePracticeBank(data: unknown) {
  return practiceBankSchema.safeParse(data)
}

export function parsePracticeBank(data: unknown): PracticeBank {
  return practiceBankSchema.parse(data)
}
