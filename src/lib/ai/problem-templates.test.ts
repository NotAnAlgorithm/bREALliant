import { describe, expect, it } from 'vitest'

import {
  buildGenerationPrompt,
  generateLocalCandidates,
  parseLlmCandidates,
} from './problem-templates'
import { verifyCandidate } from './verify-generated'

describe('generateLocalCandidates', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generateLocalCandidates('supremum', 3, 42)
    const b = generateLocalCandidates('supremum', 3, 42)
    expect(a).toEqual(b)
  })

  it('returns [] for tags with no template', () => {
    expect(generateLocalCandidates('not-a-real-tag', 3)).toEqual([])
  })

  // The core F8 invariant: nothing the generator emits can be unverifiable.
  it('every candidate across all tags passes the verifier', () => {
    const tags = ['supremum', 'infimum', 'density', 'archimedean', 'bounds', 'lub']
    for (const tag of tags) {
      const candidates = generateLocalCandidates(tag, 6, 7)
      for (const candidate of candidates) {
        expect(verifyCandidate(candidate)).not.toBeNull()
      }
    }
  })
})

describe('parseLlmCandidates', () => {
  it('derives the authoritative answer from the math.js expression', () => {
    const raw = JSON.stringify([
      { prompt: 'What is sup of {3, 7, -2}?', answerExpression: 'max(3, 7, -2)' },
    ])
    const [candidate] = parseLlmCandidates(raw, 'supremum')
    expect(candidate.selfTestAnswer).toBe('7')
    expect(candidate.item.validator?.accept).toEqual(['7'])
    expect(verifyCandidate(candidate)).not.toBeNull()
  })

  it('drops entries with non-evaluable or non-numeric expressions', () => {
    const raw = JSON.stringify([
      { prompt: 'ok', answerExpression: 'this is not math' },
      { prompt: 'ok', answerExpression: '"a string"' },
      { prompt: '', answerExpression: 'max(1,2)' },
      { prompt: 'good', answerExpression: '2 + 3' },
    ])
    const result = parseLlmCandidates(raw, 'supremum')
    expect(result).toHaveLength(1)
    expect(result[0].selfTestAnswer).toBe('5')
  })

  it('accepts an object wrapper (OpenAI json_object mode)', () => {
    const raw = JSON.stringify({
      problems: [{ prompt: 'inf of {2,5}?', answerExpression: 'min(2,5)' }],
    })
    const result = parseLlmCandidates(raw, 'infimum')
    expect(result).toHaveLength(1)
    expect(result[0].selfTestAnswer).toBe('2')
  })

  it('returns [] for malformed JSON', () => {
    expect(parseLlmCandidates('{not json', 'supremum')).toEqual([])
    expect(parseLlmCandidates({ not: 'an array' }, 'supremum')).toEqual([])
  })
})

describe('buildGenerationPrompt', () => {
  it('produces a system + user message naming the concept', () => {
    const messages = buildGenerationPrompt({ tag: 'density', count: 4 })
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('JSON array')
    expect(messages[1].content).toContain('density')
    expect(messages[1].content).toContain('4')
  })
})
