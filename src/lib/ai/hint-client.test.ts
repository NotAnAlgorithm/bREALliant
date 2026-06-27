import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HintContext } from './types'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { functions: { invoke } },
}))

import { aiHintsEnabled, requestHint } from './hint-client'

const context: HintContext = {
  widgetKind: 'fill_blank',
  correctAnswers: ['sqrt(2)'],
  incorrectPatterns: [{ match: '*', message: 'recall the lub property' }],
  learnerAnswer: '1',
  hintLevel: 1,
}

afterEach(() => {
  vi.unstubAllEnvs()
  invoke.mockReset()
})

describe('aiHintsEnabled', () => {
  it('is off unless the flag is exactly "true"', () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'false')
    expect(aiHintsEnabled()).toBe(false)
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'true')
    expect(aiHintsEnabled()).toBe(true)
  })
})

describe('requestHint', () => {
  it('returns null and does not call the edge function when disabled', async () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'false')
    const result = await requestHint(context)
    expect(result).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns the hint text when enabled and the function succeeds', async () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'true')
    invoke.mockResolvedValue({ data: { hint: '  Think about upper bounds.  ' }, error: null })
    const result = await requestHint(context)
    expect(result).toBe('Think about upper bounds.')
    expect(invoke).toHaveBeenCalledWith('hint', expect.objectContaining({
      body: expect.objectContaining({ messages: expect.any(Array) }),
    }))
  })

  it('falls back to null on edge-function error', async () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'true')
    invoke.mockResolvedValue({ data: null, error: { message: 'boom' } })
    expect(await requestHint(context)).toBeNull()
  })

  it('falls back to null when the call throws', async () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'true')
    invoke.mockRejectedValue(new Error('network'))
    expect(await requestHint(context)).toBeNull()
  })

  it('returns null when the hint is empty', async () => {
    vi.stubEnv('VITE_AI_HINTS_ENABLED', 'true')
    invoke.mockResolvedValue({ data: { hint: '   ' }, error: null })
    expect(await requestHint(context)).toBeNull()
  })
})
