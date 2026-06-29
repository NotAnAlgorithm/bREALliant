import { afterEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke } },
}))

import {
  aiGenerationEnabled,
  fetchGeneratedConceptItems,
  fetchGeneratedItems,
  getGeneratedItems,
  localGeneratedItems,
} from './generated-bank'
import { runValidator } from '../validators/run-validator'

const conceptItem = {
  prompt: 'Which set is clopen in $\\mathbb{R}$?',
  difficulty: 1,
  widget: 'multiple_choice',
  choices: [
    { id: 'a', label: '$\\mathbb{R}$' },
    { id: 'b', label: '$(0,1)$' },
    { id: 'c', label: '$[0,1]$' },
  ],
  correct: 'a',
  feedback: { correct: 'clopen', incorrect: [{ match: '*', message: 'empty boundary?' }] },
}

afterEach(() => {
  vi.unstubAllEnvs()
  invoke.mockReset()
})

function assertAllServable(items: { validator?: unknown }[]) {
  for (const item of items) {
    expect(item.validator).toBeTruthy()
  }
}

describe('localGeneratedItems', () => {
  it('always returns verified items (no network, AI off)', () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'false')
    const items = localGeneratedItems('supremum', 4)
    expect(items.length).toBeGreaterThan(0)
    assertAllServable(items)
  })
})

describe('fetchGeneratedItems', () => {
  it('returns [] and does not call the function when generation is disabled', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'false')
    expect(await fetchGeneratedItems('supremum')).toEqual([])
    expect(invoke).not.toHaveBeenCalled()
  })

  it('keeps only verified items from the LLM proposal', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    invoke.mockResolvedValue({
      data: {
        raw: JSON.stringify([
          { prompt: 'sup of {1,4,2}?', answerExpression: 'max(1,4,2)' },
          { prompt: 'garbage', answerExpression: 'not math at all' },
        ]),
      },
      error: null,
    })
    const items = await fetchGeneratedItems('supremum')
    expect(items).toHaveLength(1)
    // The served answer is provably accepted by the served validator.
    expect(runValidator(items[0].validator!, '4')).toBe(true)
  })

  it('falls back to [] on edge-function error', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await fetchGeneratedItems('supremum')).toEqual([])
  })
})

describe('getGeneratedItems', () => {
  it('returns the deterministic baseline even with AI off', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'false')
    const items = await getGeneratedItems('density', 3)
    expect(items.length).toBeGreaterThan(0)
    assertAllServable(items)
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('fetchGeneratedConceptItems', () => {
  it('returns [] without calling the function when disabled', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'false')
    expect(await fetchGeneratedConceptItems(['open-set'])).toEqual([])
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns [] without a network call when no tags are given', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    expect(await fetchGeneratedConceptItems([])).toEqual([])
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns only verified, gradeable conceptual items', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    invoke.mockResolvedValue({
      data: { raw: JSON.stringify({ items: [conceptItem, { prompt: 'broken' }] }) },
      error: null,
    })
    const items = await fetchGeneratedConceptItems(['open-set'])
    expect(items).toHaveLength(1)
    expect(items[0].widget.kind).toBe('multiple_choice')
    expect(runValidator(items[0].validator!, 'a')).toBe(true)
  })

  it('falls back to [] on edge-function error', async () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await fetchGeneratedConceptItems(['open-set'])).toEqual([])
  })
})

describe('aiGenerationEnabled', () => {
  it('is off unless the flag is exactly "true"', () => {
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'true')
    expect(aiGenerationEnabled()).toBe(true)
    vi.stubEnv('VITE_AI_GENERATION_ENABLED', 'nope')
    expect(aiGenerationEnabled()).toBe(false)
  })
})
