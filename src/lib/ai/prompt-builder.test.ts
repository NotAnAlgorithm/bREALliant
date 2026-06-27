import { describe, expect, it } from 'vitest'

import {
  buildHintContext,
  buildHintMessages,
  HINT_SYSTEM_PROMPT,
  MAX_HINT_LEVEL,
  type GradedProblemLike,
} from './prompt-builder'

const problem: GradedProblemLike = {
  prompt: 'What is $\\sup A$?',
  widget: { kind: 'fill_blank' },
  validator: { accept: ['sqrt(2)', '2^(1/2)'] },
  feedback: {
    incorrect: [
      { match: '1', message: 'That is a lower bound, not the supremum.' },
      { match: '*', message: 'Recall the least upper bound property.' },
    ],
  },
}

describe('buildHintContext', () => {
  it('extracts grounded fields from a problem and learner attempt', () => {
    const ctx = buildHintContext({
      problem,
      learnerAnswer: '1',
      hintLevel: 2,
      lessonTitle: 'LUB',
    })

    expect(ctx.widgetKind).toBe('fill_blank')
    expect(ctx.correctAnswers).toEqual(['sqrt(2)', '2^(1/2)'])
    expect(ctx.incorrectPatterns).toHaveLength(2)
    expect(ctx.learnerAnswer).toBe('1')
    expect(ctx.stepPrompt).toContain('\\sup A')
    expect(ctx.lessonTitle).toBe('LUB')
    expect(ctx.hintLevel).toBe(2)
  })

  it('clamps hint level into [1, MAX_HINT_LEVEL]', () => {
    expect(buildHintContext({ problem, learnerAnswer: '', hintLevel: 0 }).hintLevel).toBe(1)
    expect(
      buildHintContext({ problem, learnerAnswer: '', hintLevel: 99 }).hintLevel,
    ).toBe(MAX_HINT_LEVEL)
  })
})

describe('buildHintMessages', () => {
  it('enforces the never-reveal policy in the system prompt', () => {
    const [system] = buildHintMessages(
      buildHintContext({ problem, learnerAnswer: '1', hintLevel: 1 }),
    )
    expect(system.role).toBe('system')
    expect(system.content).toBe(HINT_SYSTEM_PROMPT)
    expect(system.content.toLowerCase()).toContain('never reveal')
    expect(system.content.toLowerCase()).toContain('do not decide correctness')
  })

  it('includes the grounded attempt and marks the answer secret', () => {
    const [, user] = buildHintMessages(
      buildHintContext({ problem, learnerAnswer: '1', hintLevel: 1 }),
    )
    expect(user.role).toBe('user')
    expect(user.content).toContain("Learner's incorrect answer: 1")
    expect(user.content).toContain('SECRET, never reveal')
    expect(user.content).toContain('least upper bound property')
  })

  it('escalates guidance with hint level', () => {
    const level1 = buildHintMessages(
      buildHintContext({ problem, learnerAnswer: '1', hintLevel: 1 }),
    )[1].content
    const level2 = buildHintMessages(
      buildHintContext({ problem, learnerAnswer: '1', hintLevel: 2 }),
    )[1].content
    expect(level1).toContain('Level 1')
    expect(level2).toContain('Level 2')
    expect(level2.toLowerCase()).toContain('schema cue')
  })
})
