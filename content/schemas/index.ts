import { z } from 'zod'

import { blockSchema } from './blocks'
import { feedbackSchema } from './feedback'
import { validatorSchema } from './validators'
import { widgetSchema } from './widgets'

const stepBaseSchema = z.object({
  id: z.string().min(1),
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

export const problemStepSchema = stepBaseSchema.extend({
  type: z.literal('problem'),
  prompt: z.string().optional(),
  widget: widgetSchema,
  validator: validatorSchema,
  feedback: feedbackSchema,
})

export const summaryStepSchema = stepBaseSchema.extend({
  type: z.literal('summary'),
  blocks: z.array(blockSchema),
})

export const quizItemSchema = z.object({
  id: z.string().min(1),
  prompt: z.string(),
  widget: widgetSchema,
  validator: validatorSchema.optional(),
  feedback: feedbackSchema.optional(),
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
  quizStepSchema,
])

export type Step = z.infer<typeof stepSchema>
export type MotivationStep = z.infer<typeof motivationStepSchema>
export type DiscoverStep = z.infer<typeof discoverStepSchema>
export type ProblemStep = z.infer<typeof problemStepSchema>
export type SummaryStep = z.infer<typeof summaryStepSchema>
export type QuizStep = z.infer<typeof quizStepSchema>
export type QuizItem = z.infer<typeof quizItemSchema>

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
    steps: z.array(stepSchema).min(1),
  })
  .refine((lesson) => assertUniqueStepIds(lesson.steps), {
    message: 'Lesson steps must have unique ids',
    path: ['steps'],
  })

export type Lesson = z.infer<typeof lessonSchema>

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
