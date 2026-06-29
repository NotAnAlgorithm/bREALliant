import { describe, expect, it } from 'vitest'

import {
  buildConceptCandidate,
  buildConceptGenerationPrompt,
  parseConceptCandidates,
} from './concept-generation'
import { verifyAll } from './verify-generated'
import { runValidator } from '../validators/run-validator'

const validMcq = {
  prompt: 'Which set is both open and closed in $\\mathbb{R}$?',
  difficulty: 1,
  widget: 'multiple_choice',
  choices: [
    { id: 'a', label: '$\\mathbb{R}$' },
    { id: 'b', label: '$(0,1)$' },
    { id: 'c', label: '$[0,1]$' },
    { id: 'd', label: '$\\{0\\}$' },
  ],
  correct: 'a',
  feedback: {
    correct: '$\\mathbb{R}$ (and $\\varnothing$) are clopen.',
    incorrect: [{ match: '*', message: 'Which sets have empty boundary?' }],
  },
}

describe('buildConceptGenerationPrompt', () => {
  it('produces a grounded system + user message naming the concepts', () => {
    const messages = buildConceptGenerationPrompt({ tags: ['open-set', 'closed-set'], count: 4 })
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('open-set, closed-set')
    expect(messages[1].content).toContain('4 conceptual problems')
  })

  it('includes an optional mastery hint when given', () => {
    const messages = buildConceptGenerationPrompt({
      tags: ['series'],
      masteryHint: 'practiced',
    })
    expect(messages[1].content).toContain('practiced')
  })

  it('lists existing prompts to avoid when provided', () => {
    const messages = buildConceptGenerationPrompt({
      tags: ['open-set'],
      avoidPrompts: ['Which set is both open and closed in $\\mathbb{R}$?'],
    })
    expect(messages[1].content).toContain('ALREADY EXIST')
    expect(messages[1].content).toContain('both open and closed')
  })
})

describe('buildConceptCandidate', () => {
  it('accepts a well-formed multiple_choice item with a set_match validator', () => {
    const candidate = buildConceptCandidate(validMcq, 'open-set')
    expect(candidate).not.toBeNull()
    expect(candidate!.item.widget.kind).toBe('multiple_choice')
    expect(candidate!.item.validator).toEqual({
      type: 'set_match',
      engine: 'mathjs',
      accept: ['a'],
    })
    expect(candidate!.selfTestAnswer).toBe('a')
  })

  it('canonically sorts multiple_select correct ids', () => {
    const candidate = buildConceptCandidate(
      {
        ...validMcq,
        widget: 'multiple_select',
        prompt: 'Select all clopen sets. *(two are correct)*',
        choices: [
          { id: 'a', label: '$\\mathbb{R}$' },
          { id: 'b', label: '$(0,1)$' },
          { id: 'c', label: '$\\varnothing$' },
        ],
        correct: ['c', 'a'],
      },
      'open-set',
    )
    expect(candidate!.item.validator!.accept).toEqual(['a,c'])
    expect(candidate!.selfTestAnswer).toBe('a,c')
  })

  it('accepts spot_the_flaw with the flawed step id', () => {
    const candidate = buildConceptCandidate(
      {
        prompt: 'Find the invalid step.',
        difficulty: 3,
        widget: 'spot_the_flaw',
        steps: [
          { id: 'p1', label: 'Sound step.' },
          { id: 'p2', label: 'Broken step.' },
        ],
        correct: 'p2',
        feedback: { correct: 'p2 is the flaw.', incorrect: [{ match: '*', message: 'Recheck each.' }] },
      },
      'topology',
    )
    expect(candidate!.item.validator!.accept).toEqual(['p2'])
  })

  it('appends a catch-all when the model omits one', () => {
    const candidate = buildConceptCandidate(
      { ...validMcq, feedback: { correct: 'ok', incorrect: [] } },
      'open-set',
    )
    const incorrect = candidate!.item.feedback!.incorrect
    expect(incorrect[incorrect.length - 1].match).toBe('*')
  })

  it.each([
    ['unknown widget kind', { ...validMcq, widget: 'slider' }],
    ['fewer than two choices', { ...validMcq, choices: [{ id: 'a', label: 'only' }] }],
    ['correct id not offered', { ...validMcq, correct: 'z' }],
    ['multiple_choice with two correct', { ...validMcq, correct: ['a', 'b'] }],
    ['missing prompt', { ...validMcq, prompt: '' }],
    ['missing feedback.correct', { ...validMcq, feedback: { incorrect: [] } }],
    ['duplicate choice ids', { ...validMcq, choices: [{ id: 'a', label: 'x' }, { id: 'a', label: 'y' }] }],
  ])('rejects %s', (_label, raw) => {
    expect(buildConceptCandidate(raw, 'open-set')).toBeNull()
  })
})

describe('parseConceptCandidates', () => {
  it('reads a { items: [...] } wrapper and drops malformed entries', () => {
    const candidates = parseConceptCandidates(
      { items: [validMcq, { prompt: 'broken', widget: 'multiple_choice' }] },
      ['open-set'],
    )
    expect(candidates).toHaveLength(1)
  })

  it('reads a bare array', () => {
    expect(parseConceptCandidates([validMcq], ['open-set'])).toHaveLength(1)
  })

  it('parses a fenced JSON string', () => {
    const raw = '```json\n' + JSON.stringify({ items: [validMcq] }) + '\n```'
    expect(parseConceptCandidates(raw, ['open-set'])).toHaveLength(1)
  })

  it('returns [] for unparseable input', () => {
    expect(parseConceptCandidates('not json', ['x'])).toEqual([])
  })

  it('honours a per-item tag when it is among the requested concepts', () => {
    const candidates = parseConceptCandidates(
      { items: [{ ...validMcq, tag: 'closed-set' }] },
      ['open-set', 'closed-set'],
    )
    expect(candidates[0].tag).toBe('closed-set')
  })

  it('falls back to the first requested tag for an unrecognised item tag', () => {
    const candidates = parseConceptCandidates(
      { items: [{ ...validMcq, tag: 'not-requested' }] },
      ['open-set'],
    )
    expect(candidates[0].tag).toBe('open-set')
  })

  it('every parsed candidate passes the shared verifier and is gradeable', () => {
    const candidates = parseConceptCandidates({ items: [validMcq] }, ['open-set'])
    const verified = verifyAll(candidates)
    expect(verified).toHaveLength(1)
    expect(runValidator(verified[0].validator!, 'a')).toBe(true)
  })

  it('drops a candidate that restates an existing bank prompt', () => {
    const candidates = parseConceptCandidates({ items: [validMcq] }, ['open-set'], [
      validMcq.prompt,
    ])
    expect(candidates).toHaveLength(0)
  })

  it('drops near-duplicate prompts even with light rewording', () => {
    const candidates = parseConceptCandidates({ items: [validMcq] }, ['open-set'], [
      'Which set is both open and closed when working in the reals?',
    ])
    expect(candidates).toHaveLength(0)
  })

  it('de-duplicates repeated items within a single batch', () => {
    const candidates = parseConceptCandidates(
      { items: [validMcq, validMcq] },
      ['open-set'],
    )
    expect(candidates).toHaveLength(1)
  })
})
